"""Maintain review segments in db."""

import logging
import random
import string
import threading
from enum import Enum
from multiprocessing.synchronize import Event as MpEvent
from typing import Optional

from frigate.comms.config_updater import ConfigSubscriber
from frigate.comms.detections_updater import DetectionSubscriber, DetectionTypeEnum
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.const import UPSERT_REVIEW_SEGMENT
from frigate.models import ReviewSegment
from frigate.object_processing import TrackedObject

logger = logging.getLogger(__name__)


class SeverityEnum(str, Enum):
    alert = "alert"
    detection = "detection"
    signification_motion = "significant_motion"


class PendingReviewSegment:

    def __init__(self, camera: str, frame_time: float, severity: SeverityEnum):
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        self.id = f"{frame_time}-{rand_id}"
        self.camera = camera
        self.start_time = frame_time
        self.severity = severity
        self.data: dict[str, set] = {
            "objects": set(),
            "zones": set(),
            "audio": set(),
            "significant_motion_areas": [],
        }
        self.last_update = frame_time

    def end(self) -> dict:
        return {
            ReviewSegment.id: self.id,
            ReviewSegment.camera: self.camera,
            ReviewSegment.start_time: self.start_time,
            ReviewSegment.end_time: self.last_update,
            ReviewSegment.severity: self.severity.value,
            ReviewSegment.thumb_path: "somewhere",
            ReviewSegment.data: self.data,
        }


class ReviewSegmentMaintainer(threading.Thread):
    """Maintain review segments."""

    def __init__(self, config: FrigateConfig, stop_event: MpEvent):
        threading.Thread.__init__(self)
        self.name = "review_segment_maintainer"
        self.config = config
        self.active_review_segments: dict[str, Optional[PendingReviewSegment]] = {}

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
        active_objects = [
            o
            for o in objects
            if o.obj_data["motionless_count"]
            > camera_config.detect.stationary.threshold
        ]

        if len(active_objects) > 0:

            if segment.severity == SeverityEnum.signification_motion:
                segment.severity = SeverityEnum.detection

            for object in active_objects:
                segment.data["objects"].add(object.obj_data["label"])

                if segment.severity == SeverityEnum.detection and object.has_clip:
                    segment.severity = SeverityEnum.alert

                if object.current_zones:
                    segment.data["zones"].update(object.current_zones)
        elif frame_time > (segment.last_update + camera_config.detect.max_disappeared):
            self.end_segment(segment)

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

            (topic, data) = self.detection_subscriber.get_data()

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
                        topic,
                        current_segment,
                        frame_time,
                        current_tracked_objects,
                        motion_boxes,
                    )
                elif topic == DetectionTypeEnum.audio:
                    pass
            else:
                pass
