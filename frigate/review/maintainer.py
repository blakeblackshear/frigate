"""Maintain review segments in db."""

import json
import logging
import os
import random
import string
import sys
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
from frigate.const import ALL_ATTRIBUTE_LABELS, CLIPS_DIR, UPSERT_REVIEW_SEGMENT
from frigate.events.external import ManualEventState
from frigate.models import ReviewSegment
from frigate.object_processing import TrackedObject
from frigate.util.image import SharedMemoryFrameManager, calculate_16_9_crop

logger = logging.getLogger(__name__)


THUMB_HEIGHT = 180
THUMB_WIDTH = 320

THRESHOLD_ALERT_ACTIVITY = 120
THRESHOLD_DETECTION_ACTIVITY = 30
THRESHOLD_MOTION_ACTIVITY = 30


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
        detections: dict[str, str],
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
            cv2.imwrite(path, self.frame, [int(cv2.IMWRITE_WEBP_QUALITY), 60])

        return {
            ReviewSegment.id: self.id,
            ReviewSegment.camera: self.camera,
            ReviewSegment.start_time: self.start_time,
            ReviewSegment.end_time: self.last_update,
            ReviewSegment.severity: self.severity.value,
            ReviewSegment.thumb_path: path,
            ReviewSegment.data: {
                "detections": list(set(self.detections.keys())),
                "objects": list(set(self.detections.values())),
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

        # manual events
        self.indefinite_events: dict[str, dict[str, any]] = {}

        self.stop_event = stop_event

    def end_segment(self, segment: PendingReviewSegment) -> None:
        """End segment."""
        seg_data = segment.end()
        self.requestor.send_data(UPSERT_REVIEW_SEGMENT, seg_data)
        self.requestor.send_data(
            "reviews",
            json.dumps(
                {"type": "end", "review": {k.name: v for k, v in seg_data.items()}}
            ),
        )
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
            if frame_time > segment.last_update:
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
                if not object["sub_label"]:
                    segment.detections[object["id"]] = object["label"]
                elif object["sub_label"][0] in ALL_ATTRIBUTE_LABELS:
                    segment.detections[object["id"]] = object["sub_label"][0]
                else:
                    segment.detections[object["id"]] = f'{object["label"]}-verified'

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
            segment.severity == SeverityEnum.signification_motion
            and len(motion) >= THRESHOLD_MOTION_ACTIVITY
        ):
            if frame_time > segment.last_update:
                segment.last_update = frame_time
        else:
            if segment.severity == SeverityEnum.alert and frame_time > (
                segment.last_update + THRESHOLD_ALERT_ACTIVITY
            ):
                self.end_segment(segment)
            elif frame_time > (segment.last_update + THRESHOLD_DETECTION_ACTIVITY):
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
            detections: dict[str, str] = {}
            zones: set = set()

            for object in active_objects:
                if (
                    not has_sig_object
                    and object["has_clip"]
                    and object["label"] in camera_config.objects.alert
                ):
                    has_sig_object = True

                if not object["sub_label"]:
                    detections[object["id"]] = object["label"]
                elif object["sub_label"][0] in ALL_ATTRIBUTE_LABELS:
                    detections[object["id"]] = object["sub_label"][0]
                else:
                    detections[object["id"]] = f'{object["label"]}-verified'

                zones.update(object["current_zones"])

            self.active_review_segments[camera] = PendingReviewSegment(
                camera,
                frame_time,
                SeverityEnum.alert if has_sig_object else SeverityEnum.detection,
                detections,
                audio=set(),
                zones=zones,
                motion=[],
            )

            frame_id = f"{camera_config.name}{frame_time}"
            yuv_frame = self.frame_manager.get(frame_id, camera_config.frame_shape_yuv)
            self.active_review_segments[camera].update_frame(
                camera_config, yuv_frame, active_objects
            )
            self.frame_manager.close(frame_id)
        elif len(motion) >= 20:
            self.active_review_segments[camera] = PendingReviewSegment(
                camera,
                frame_time,
                SeverityEnum.signification_motion,
                detections={},
                audio=set(),
                motion=motion,
                zones=set(),
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
            elif topic == DetectionTypeEnum.api:
                (
                    camera,
                    frame_time,
                    manual_info,
                ) = data

                if camera not in self.indefinite_events:
                    self.indefinite_events[camera] = {}

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
                    if frame_time > current_segment.last_update:
                        current_segment.last_update = frame_time

                    current_segment.audio.update(audio_detections)
                elif topic == DetectionTypeEnum.api:
                    if manual_info["state"] == ManualEventState.complete:
                        current_segment.detections[manual_info["event_id"]] = (
                            manual_info["label"]
                        )
                        current_segment.severity = SeverityEnum.alert
                        current_segment.last_update = manual_info["end_time"]
                    elif manual_info["state"] == ManualEventState.start:
                        self.indefinite_events[camera][manual_info["event_id"]] = (
                            manual_info["label"]
                        )
                        current_segment.detections[manual_info["event_id"]] = (
                            manual_info["label"]
                        )
                        current_segment.severity = SeverityEnum.alert

                        # temporarily make it so this event can not end
                        current_segment.last_update = sys.maxsize
                    elif manual_info["state"] == ManualEventState.end:
                        self.indefinite_events[camera].pop(manual_info["event_id"])
                        current_segment.last_update = manual_info["end_time"]
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
                        {},
                        set(),
                        set(audio_detections),
                        [],
                    )
                elif topic == DetectionTypeEnum.api:
                    self.active_review_segments[camera] = PendingReviewSegment(
                        camera,
                        frame_time,
                        SeverityEnum.alert,
                        {manual_info["event_id"]: manual_info["label"]},
                        set(),
                        set(),
                        [],
                    )

                    if manual_info["state"] == ManualEventState.start:
                        self.indefinite_events[camera][manual_info["event_id"]] = (
                            manual_info["label"]
                        )
                        # temporarily make it so this event can not end
                        self.active_review_segments[camera] = sys.maxsize
                    elif manual_info["state"] == ManualEventState.complete:
                        self.active_review_segments[camera].last_update = manual_info[
                            "end_time"
                        ]


def get_active_objects(
    frame_time: float, camera_config: CameraConfig, all_objects: list[TrackedObject]
) -> list[TrackedObject]:
    """get active objects for detection."""
    return [
        o
        for o in all_objects
        if o["motionless_count"] < camera_config.detect.stationary.threshold
        and o["position_changes"] > 0
        and o["frame_time"] == frame_time
        and not o["false_positive"]
    ]
