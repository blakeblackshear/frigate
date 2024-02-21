"""Maintain review segments in db."""

import logging
import os
import random
import string
import threading
from enum import Enum
from multiprocessing.synchronize import Event as MpEvent
from typing import Optional

import cv2
import numpy as np

from frigate.comms.config_updater import ConfigSubscriber
from frigate.comms.detections_updater import DetectionSubscriber, DetectionTypeEnum
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, FrigateConfig
from frigate.const import CLIPS_DIR, UPSERT_REVIEW_SEGMENT
from frigate.models import ReviewSegment
from frigate.object_processing import TrackedObject
from frigate.util.image import SharedMemoryFrameManager, calculate_16_9_crop

logger = logging.getLogger(__name__)


THUMB_HEIGHT = 180
THUMB_WIDTH = 320


class SeverityEnum(str, Enum):
    alert = "alert"
    detection = "detection"
    signification_motion = "significant_motion"


class PendingReviewSegment:
    def __init__(
        self,
        camera: str,
        frame_time: float,
        severity: SeverityEnum,
        detections: set[str] = set(),
        objects: set[str] = set(),
        sub_labels: set[str] = set(),
        zones: set[str] = set(),
        audio: set[str] = set(),
        motion: list[int] = [],
    ):
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        self.id = f"{frame_time}-{rand_id}"
        self.camera = camera
        self.start_time = frame_time
        self.severity = severity
        self.detections = detections
        self.objects = objects
        self.sub_labels = sub_labels
        self.zones = zones
        self.audio = audio
        self.sig_motion_areas = motion
        self.last_update = frame_time

        # thumbnail
        self.frame = np.zeros((THUMB_HEIGHT * 3 // 2, THUMB_WIDTH), np.uint8)
        self.frame_active_count = 0

    def update_frame(
        self, camera_config: CameraConfig, frame, objects: list[TrackedObject]
    ):
        min_x = camera_config.frame_shape[1]
        min_y = camera_config.frame_shape[0]
        max_x = 0
        max_y = 0

        # find bounds for all boxes
        for o in objects:
            min_x = min(o["box"][0], min_x)
            min_y = min(o["box"][1], min_y)
            max_x = max(o["box"][2], max_x)
            max_y = max(o["box"][3], max_y)

        region = calculate_16_9_crop(
            camera_config.frame_shape, min_x, min_y, max_x, max_y
        )

        # could not find suitable 16:9 region
        if not region:
            return

        self.frame_active_count = len(objects)
        color_frame = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)
        color_frame = color_frame[region[1] : region[3], region[0] : region[2]]
        width = int(THUMB_HEIGHT * color_frame.shape[1] / color_frame.shape[0])
        self.frame = cv2.resize(
            color_frame, dsize=(width, THUMB_HEIGHT), interpolation=cv2.INTER_AREA
        )

    def end(self) -> dict:
        path = os.path.join(CLIPS_DIR, f"thumb-{self.camera}-{self.id}.jpg")

        if self.frame is not None:
            cv2.imwrite(path, self.frame)

        return {
            ReviewSegment.id: self.id,
            ReviewSegment.camera: self.camera,
            ReviewSegment.start_time: self.start_time,
            ReviewSegment.end_time: self.last_update,
            ReviewSegment.severity: self.severity.value,
            ReviewSegment.thumb_path: path,
            ReviewSegment.data: {
                "detections": list(self.detections),
                "objects": list(self.objects),
                "sub_labels": list(self.sub_labels),
                "zones": list(self.zones),
                "audio": list(self.audio),
                "significant_motion_areas": self.sig_motion_areas,
            },
        }


class ReviewSegmentMaintainer(threading.Thread):
    """Maintain review segments."""

    def __init__(self, config: FrigateConfig, stop_event: MpEvent):
        threading.Thread.__init__(self)
        self.name = "review_segment_maintainer"
        self.config = config
        self.active_review_segments: dict[str, Optional[PendingReviewSegment]] = {}
        self.frame_manager = SharedMemoryFrameManager()

        # create communication for review segments
        self.requestor = InterProcessRequestor()
        self.config_subscriber = ConfigSubscriber("config/record/")
        self.detection_subscriber = DetectionSubscriber(DetectionTypeEnum.all)

        self.stop_event = stop_event

    def end_segment(self, segment: PendingReviewSegment) -> None:
        """End segment."""
        self.requestor.send_data(UPSERT_REVIEW_SEGMENT, segment.end())
        self.active_review_segments[segment.camera] = None

    def update_existing_segment(
        self,
        segment: PendingReviewSegment,
        frame_time: float,
        objects: list[TrackedObject],
        motion: list,
    ) -> None:
        """Validate if existing review segment should continue."""
        camera_config = self.config.cameras[segment.camera]
        active_objects = get_active_objects(frame_time, camera_config, objects)

        if len(active_objects) > 0:
            segment.last_update = frame_time

            # update type for this segment now that active objects are detected
            if segment.severity == SeverityEnum.signification_motion:
                segment.severity = SeverityEnum.detection

            if len(active_objects) > segment.frame_active_count:
                frame_id = f"{camera_config.name}{frame_time}"
                yuv_frame = self.frame_manager.get(
                    frame_id, camera_config.frame_shape_yuv
                )
                segment.update_frame(camera_config, yuv_frame, active_objects)
                self.frame_manager.close(frame_id)

            for object in active_objects:
                segment.detections.add(object["id"])
                segment.objects.add(object["label"])

                if object["sub_label"]:
                    segment.sub_labels.add(object["sub_label"][0])

                # if object is alert label and has qualified for recording
                # mark this review as alert
                if (
                    segment.severity == SeverityEnum.detection
                    and object["has_clip"]
                    and object["label"] in camera_config.objects.alert
                ):
                    segment.severity = SeverityEnum.alert

                # keep zones up to date
                if len(object["current_zones"]) > 0:
                    segment.zones.update(object["current_zones"])
        elif (
            segment.severity == SeverityEnum.signification_motion and len(motion) >= 20
        ):
            segment.last_update = frame_time
        else:
            if segment.severity == SeverityEnum.alert and frame_time > (
                segment.last_update + 60
            ):
                self.end_segment(segment)
            elif frame_time > (segment.last_update + 10):
                self.end_segment(segment)

    def check_if_new_segment(
        self,
        camera: str,
        frame_time: float,
        objects: list[TrackedObject],
        motion: list,
    ) -> None:
        """Check if a new review segment should be created."""
        camera_config = self.config.cameras[camera]
        active_objects = get_active_objects(frame_time, camera_config, objects)

        if len(active_objects) > 0:
            has_sig_object = False
            detections: set = set()
            objects: set = set()
            sub_labels: set = set()
            zones: set = set()

            for object in active_objects:
                if (
                    not has_sig_object
                    and object["has_clip"]
                    and object["label"] in camera_config.objects.alert
                ):
                    has_sig_object = True

                detections.add(object["id"])
                objects.add(object["label"])

                if object["sub_label"]:
                    sub_labels.add(object["sub_label"][0])

                zones.update(object["current_zones"])

            self.active_review_segments[camera] = PendingReviewSegment(
                camera,
                frame_time,
                SeverityEnum.alert if has_sig_object else SeverityEnum.detection,
                detections,
                objects=objects,
                sub_labels=sub_labels,
                zones=zones,
            )
        elif len(motion) >= 20:
            self.active_review_segments[camera] = PendingReviewSegment(
                camera, frame_time, SeverityEnum.signification_motion, motion=motion
            )

    def run(self) -> None:
        while not self.stop_event.is_set():
            # check if there is an updated config
            while True:
                (
                    updated_topic,
                    updated_record_config,
                ) = self.config_subscriber.check_for_update()

                if not updated_topic:
                    break

                camera_name = updated_topic.rpartition("/")[-1]
                self.config.cameras[camera_name].record = updated_record_config

            (topic, data) = self.detection_subscriber.get_data(timeout=1)

            if not topic:
                continue

            if topic == DetectionTypeEnum.video:
                (
                    camera,
                    frame_time,
                    current_tracked_objects,
                    motion_boxes,
                    regions,
                ) = data
            elif topic == DetectionTypeEnum.audio:
                (
                    camera,
                    frame_time,
                    dBFS,
                    audio_detections,
                ) = data

            if not self.config.cameras[camera].record.enabled:
                continue

            current_segment = self.active_review_segments.get(camera)

            if current_segment is not None:
                if topic == DetectionTypeEnum.video:
                    self.update_existing_segment(
                        current_segment,
                        frame_time,
                        current_tracked_objects,
                        motion_boxes,
                    )
                elif topic == DetectionTypeEnum.audio and len(audio_detections) > 0:
                    current_segment.last_update = frame_time
                    current_segment.audio.update(audio_detections)
            else:
                if topic == DetectionTypeEnum.video:
                    self.check_if_new_segment(
                        camera,
                        frame_time,
                        current_tracked_objects,
                        motion_boxes,
                    )
                elif topic == DetectionTypeEnum.audio and len(audio_detections) > 0:
                    self.active_review_segments[camera] = PendingReviewSegment(
                        camera,
                        frame_time,
                        SeverityEnum.detection,
                        audio=set(audio_detections),
                    )


def get_active_objects(
    frame_time: float, camera_config: CameraConfig, all_objects: list[TrackedObject]
) -> list[TrackedObject]:
    """get active objects for detection."""
    return [
        o
        for o in all_objects
        if o["motionless_count"] < camera_config.detect.stationary.threshold
        and o["frame_time"] == frame_time
        and not o["false_positive"]
    ]
