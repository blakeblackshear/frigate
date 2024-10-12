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
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from frigate.comms.config_updater import ConfigSubscriber
from frigate.comms.detections_updater import DetectionSubscriber, DetectionTypeEnum
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, FrigateConfig
from frigate.const import (
    CLEAR_ONGOING_REVIEW_SEGMENTS,
    CLIPS_DIR,
    UPSERT_REVIEW_SEGMENT,
)
from frigate.events.external import ManualEventState
from frigate.models import ReviewSegment
from frigate.object_processing import TrackedObject
from frigate.util.image import SharedMemoryFrameManager, calculate_16_9_crop

logger = logging.getLogger(__name__)


THUMB_HEIGHT = 180
THUMB_WIDTH = 320

THRESHOLD_ALERT_ACTIVITY = 120
THRESHOLD_DETECTION_ACTIVITY = 30


class SeverityEnum(str, Enum):
    alert = "alert"
    detection = "detection"


class PendingReviewSegment:
    def __init__(
        self,
        camera: str,
        frame_time: float,
        severity: SeverityEnum,
        detections: dict[str, str],
        sub_labels: set[str],
        zones: list[str],
        audio: set[str],
    ):
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        self.id = f"{frame_time}-{rand_id}"
        self.camera = camera
        self.start_time = frame_time
        self.severity = severity
        self.detections = detections
        self.sub_labels = sub_labels
        self.zones = zones
        self.audio = audio
        self.last_update = frame_time

        # thumbnail
        self._frame = np.zeros((THUMB_HEIGHT * 3 // 2, THUMB_WIDTH), np.uint8)
        self.has_frame = False
        self.frame_active_count = 0
        self.frame_path = os.path.join(
            CLIPS_DIR, f"review/thumb-{self.camera}-{self.id}.webp"
        )

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
        self._frame = cv2.resize(
            color_frame, dsize=(width, THUMB_HEIGHT), interpolation=cv2.INTER_AREA
        )

        if self._frame is not None:
            self.has_frame = True
            cv2.imwrite(
                self.frame_path, self._frame, [int(cv2.IMWRITE_WEBP_QUALITY), 60]
            )

    def save_full_frame(self, camera_config: CameraConfig, frame):
        color_frame = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)
        width = int(THUMB_HEIGHT * color_frame.shape[1] / color_frame.shape[0])
        self._frame = cv2.resize(
            color_frame, dsize=(width, THUMB_HEIGHT), interpolation=cv2.INTER_AREA
        )

        if self._frame is not None:
            self.has_frame = True
            cv2.imwrite(
                self.frame_path, self._frame, [int(cv2.IMWRITE_WEBP_QUALITY), 60]
            )

    def get_data(self, ended: bool) -> dict:
        return {
            ReviewSegment.id.name: self.id,
            ReviewSegment.camera.name: self.camera,
            ReviewSegment.start_time.name: self.start_time,
            ReviewSegment.end_time.name: self.last_update if ended else None,
            ReviewSegment.severity.name: self.severity.value,
            ReviewSegment.thumb_path.name: self.frame_path,
            ReviewSegment.data.name: {
                "detections": list(set(self.detections.keys())),
                "objects": list(set(self.detections.values())),
                "sub_labels": list(self.sub_labels),
                "zones": self.zones,
                "audio": list(self.audio),
            },
        }.copy()


class ReviewSegmentMaintainer(threading.Thread):
    """Maintain review segments."""

    def __init__(self, config: FrigateConfig, stop_event: MpEvent):
        super().__init__(name="review_segment_maintainer")
        self.config = config
        self.active_review_segments: dict[str, Optional[PendingReviewSegment]] = {}
        self.frame_manager = SharedMemoryFrameManager()

        # create communication for review segments
        self.requestor = InterProcessRequestor()
        self.config_subscriber = ConfigSubscriber("config/record/")
        self.detection_subscriber = DetectionSubscriber(DetectionTypeEnum.all)

        # manual events
        self.indefinite_events: dict[str, dict[str, any]] = {}

        # ensure dirs
        Path(os.path.join(CLIPS_DIR, "review")).mkdir(exist_ok=True)

        self.stop_event = stop_event

        # clear ongoing review segments from last instance
        self.requestor.send_data(CLEAR_ONGOING_REVIEW_SEGMENTS, "")

    def _publish_segment_start(
        self,
        segment: PendingReviewSegment,
    ) -> None:
        """New segment."""
        new_data = segment.get_data(ended=False)
        self.requestor.send_data(UPSERT_REVIEW_SEGMENT, new_data)
        start_data = {k: v for k, v in new_data.items()}
        self.requestor.send_data(
            "reviews",
            json.dumps(
                {
                    "type": "new",
                    "before": start_data,
                    "after": start_data,
                }
            ),
        )

    def _publish_segment_update(
        self,
        segment: PendingReviewSegment,
        camera_config: CameraConfig,
        frame,
        objects: list[TrackedObject],
        prev_data: dict[str, any],
    ) -> None:
        """Update segment."""
        if frame is not None:
            segment.update_frame(camera_config, frame, objects)

        new_data = segment.get_data(ended=False)
        self.requestor.send_data(UPSERT_REVIEW_SEGMENT, new_data)
        self.requestor.send_data(
            "reviews",
            json.dumps(
                {
                    "type": "update",
                    "before": {k: v for k, v in prev_data.items()},
                    "after": {k: v for k, v in new_data.items()},
                }
            ),
        )

    def _publish_segment_end(
        self,
        segment: PendingReviewSegment,
        prev_data: dict[str, any],
    ) -> None:
        """End segment."""
        final_data = segment.get_data(ended=True)
        self.requestor.send_data(UPSERT_REVIEW_SEGMENT, final_data)
        self.requestor.send_data(
            "reviews",
            json.dumps(
                {
                    "type": "end",
                    "before": {k: v for k, v in prev_data.items()},
                    "after": {k: v for k, v in final_data.items()},
                }
            ),
        )
        self.active_review_segments[segment.camera] = None

    def update_existing_segment(
        self,
        segment: PendingReviewSegment,
        frame_time: float,
        objects: list[TrackedObject],
    ) -> None:
        """Validate if existing review segment should continue."""
        camera_config = self.config.cameras[segment.camera]

        # get active objects + objects loitering in loitering zones
        active_objects = get_active_objects(
            frame_time, camera_config, objects
        ) + get_loitering_objects(frame_time, camera_config, objects)
        prev_data = segment.get_data(False)
        has_activity = False

        if len(active_objects) > 0:
            has_activity = True
            should_update = False

            if frame_time > segment.last_update:
                segment.last_update = frame_time

            for object in active_objects:
                if not object["sub_label"]:
                    segment.detections[object["id"]] = object["label"]
                elif object["sub_label"][0] in self.config.model.all_attributes:
                    segment.detections[object["id"]] = object["sub_label"][0]
                else:
                    segment.detections[object["id"]] = f'{object["label"]}-verified'
                    segment.sub_labels.add(object["sub_label"][0])

                # if object is alert label
                # and has entered required zones or required zones is not set
                # mark this review as alert
                if (
                    segment.severity != SeverityEnum.alert
                    and object["label"] in camera_config.review.alerts.labels
                    and (
                        not camera_config.review.alerts.required_zones
                        or (
                            len(object["current_zones"]) > 0
                            and set(object["current_zones"])
                            & set(camera_config.review.alerts.required_zones)
                        )
                    )
                ):
                    segment.severity = SeverityEnum.alert
                    should_update = True

                # keep zones up to date
                if len(object["current_zones"]) > 0:
                    for zone in object["current_zones"]:
                        if zone not in segment.zones:
                            segment.zones.append(zone)

            if len(active_objects) > segment.frame_active_count:
                should_update = True

            if should_update:
                try:
                    frame_id = f"{camera_config.name}{frame_time}"
                    yuv_frame = self.frame_manager.get(
                        frame_id, camera_config.frame_shape_yuv
                    )

                    if yuv_frame is None:
                        logger.debug(f"Failed to get frame {frame_id} from SHM")
                        return

                    self._publish_segment_update(
                        segment, camera_config, yuv_frame, active_objects, prev_data
                    )
                    self.frame_manager.close(frame_id)
                except FileNotFoundError:
                    return

        if not has_activity:
            if not segment.has_frame:
                try:
                    frame_id = f"{camera_config.name}{frame_time}"
                    yuv_frame = self.frame_manager.get(
                        frame_id, camera_config.frame_shape_yuv
                    )

                    if yuv_frame is None:
                        logger.debug(f"Failed to get frame {frame_id} from SHM")
                        return

                    segment.save_full_frame(camera_config, yuv_frame)
                    self.frame_manager.close(frame_id)
                    self._publish_segment_update(
                        segment, camera_config, None, [], prev_data
                    )
                except FileNotFoundError:
                    return

            if segment.severity == SeverityEnum.alert and frame_time > (
                segment.last_update + THRESHOLD_ALERT_ACTIVITY
            ):
                self._publish_segment_end(segment, prev_data)
            elif frame_time > (segment.last_update + THRESHOLD_DETECTION_ACTIVITY):
                self._publish_segment_end(segment, prev_data)

    def check_if_new_segment(
        self,
        camera: str,
        frame_time: float,
        objects: list[TrackedObject],
    ) -> None:
        """Check if a new review segment should be created."""
        camera_config = self.config.cameras[camera]
        active_objects = get_active_objects(frame_time, camera_config, objects)

        if len(active_objects) > 0:
            detections: dict[str, str] = {}
            sub_labels = set()
            zones: list[str] = []
            severity = None

            for object in active_objects:
                if not object["sub_label"]:
                    detections[object["id"]] = object["label"]
                elif object["sub_label"][0] in self.config.model.all_attributes:
                    detections[object["id"]] = object["sub_label"][0]
                else:
                    detections[object["id"]] = f'{object["label"]}-verified'
                    sub_labels.add(object["sub_label"][0])

                # if object is alert label
                # and has entered required zones or required zones is not set
                # mark this review as alert
                if (
                    severity != SeverityEnum.alert
                    and object["label"] in camera_config.review.alerts.labels
                    and (
                        not camera_config.review.alerts.required_zones
                        or (
                            len(object["current_zones"]) > 0
                            and set(object["current_zones"])
                            & set(camera_config.review.alerts.required_zones)
                        )
                    )
                ):
                    severity = SeverityEnum.alert

                # if object is detection label
                # and review is not already a detection or alert
                # and has entered required zones or required zones is not set
                # mark this review as alert
                if (
                    not severity
                    and (
                        camera_config.review.detections.labels is None
                        or object["label"] in (camera_config.review.detections.labels)
                    )
                    and (
                        not camera_config.review.detections.required_zones
                        or (
                            len(object["current_zones"]) > 0
                            and set(object["current_zones"])
                            & set(camera_config.review.detections.required_zones)
                        )
                    )
                ):
                    severity = SeverityEnum.detection

                for zone in object["current_zones"]:
                    if zone not in zones:
                        zones.append(zone)

            if severity:
                self.active_review_segments[camera] = PendingReviewSegment(
                    camera,
                    frame_time,
                    severity,
                    detections,
                    sub_labels=sub_labels,
                    audio=set(),
                    zones=zones,
                )

                try:
                    frame_id = f"{camera_config.name}{frame_time}"
                    yuv_frame = self.frame_manager.get(
                        frame_id, camera_config.frame_shape_yuv
                    )

                    if yuv_frame is None:
                        logger.debug(f"Failed to get frame {frame_id} from SHM")
                        return

                    self.active_review_segments[camera].update_frame(
                        camera_config, yuv_frame, active_objects
                    )
                    self.frame_manager.close(frame_id)
                    self._publish_segment_start(self.active_review_segments[camera])
                except FileNotFoundError:
                    return

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

            (topic, data) = self.detection_subscriber.check_for_update(timeout=1)

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

            current_segment = self.active_review_segments.get(camera)

            if not self.config.cameras[camera].record.enabled:
                if current_segment:
                    self.update_existing_segment(current_segment, frame_time, [])

                continue

            if current_segment is not None:
                if topic == DetectionTypeEnum.video:
                    self.update_existing_segment(
                        current_segment,
                        frame_time,
                        current_tracked_objects,
                    )
                elif topic == DetectionTypeEnum.audio and len(audio_detections) > 0:
                    camera_config = self.config.cameras[camera]

                    if frame_time > current_segment.last_update:
                        current_segment.last_update = frame_time

                    for audio in audio_detections:
                        if audio in camera_config.review.alerts.labels:
                            current_segment.audio.add(audio)
                            current_segment.severity = SeverityEnum.alert
                        elif (
                            camera_config.review.detections.labels is None
                            or audio in camera_config.review.detections.labels
                        ):
                            current_segment.audio.add(audio)
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
                        event_id = manual_info["event_id"]

                        if event_id in self.indefinite_events[camera]:
                            self.indefinite_events[camera].pop(event_id)
                            current_segment.last_update = manual_info["end_time"]
                        else:
                            logger.error(
                                f"Event with ID {event_id} has a set duration and can not be ended manually."
                            )
            else:
                if topic == DetectionTypeEnum.video:
                    self.check_if_new_segment(
                        camera,
                        frame_time,
                        current_tracked_objects,
                    )
                elif topic == DetectionTypeEnum.audio and len(audio_detections) > 0:
                    severity = None

                    camera_config = self.config.cameras[camera]
                    detections = set()

                    for audio in audio_detections:
                        if audio in camera_config.review.alerts.labels:
                            detections.add(audio)
                            severity = SeverityEnum.alert
                        elif (
                            camera_config.review.detections.labels is None
                            or audio in camera_config.review.detections.labels
                        ):
                            detections.add(audio)

                            if not severity:
                                severity = SeverityEnum.detection

                    if severity:
                        self.active_review_segments[camera] = PendingReviewSegment(
                            camera,
                            frame_time,
                            severity,
                            {},
                            set(),
                            [],
                            detections,
                        )
                elif topic == DetectionTypeEnum.api:
                    self.active_review_segments[camera] = PendingReviewSegment(
                        camera,
                        frame_time,
                        SeverityEnum.alert,
                        {manual_info["event_id"]: manual_info["label"]},
                        set(),
                        [],
                        set(),
                    )

                    if manual_info["state"] == ManualEventState.start:
                        self.indefinite_events[camera][manual_info["event_id"]] = (
                            manual_info["label"]
                        )
                        # temporarily make it so this event can not end
                        self.active_review_segments[camera].last_update = sys.maxsize
                    elif manual_info["state"] == ManualEventState.complete:
                        self.active_review_segments[camera].last_update = manual_info[
                            "end_time"
                        ]

        self.config_subscriber.stop()
        self.requestor.stop()
        self.detection_subscriber.stop()
        logger.info("Exiting review maintainer...")


def get_active_objects(
    frame_time: float, camera_config: CameraConfig, all_objects: list[TrackedObject]
) -> list[TrackedObject]:
    """get active objects for detection."""
    return [
        o
        for o in all_objects
        if o["motionless_count"]
        < camera_config.detect.stationary.threshold  # no stationary objects
        and o["position_changes"] > 0  # object must have moved at least once
        and o["frame_time"] == frame_time  # object must be detected in this frame
        and not o["false_positive"]  # object must not be a false positive
        and (
            o["label"] in camera_config.review.alerts.labels
            or (
                camera_config.review.detections.labels is None
                or o["label"] in camera_config.review.detections.labels
            )
        )  # object must be in the alerts or detections label list
    ]


def get_loitering_objects(
    frame_time: float, camera_config: CameraConfig, all_objects: list[TrackedObject]
) -> list[TrackedObject]:
    """get loitering objects for detection."""
    return [
        o
        for o in all_objects
        if o["pending_loitering"]  # object must be pending loitering
        and o["position_changes"] > 0  # object must have moved at least once
        and o["frame_time"] == frame_time  # object must be detected in this frame
        and not o["false_positive"]  # object must not be a false positive
        and (
            o["label"] in camera_config.review.alerts.labels
            or (
                camera_config.review.detections.labels is None
                or o["label"] in camera_config.review.detections.labels
            )
        )  # object must be in the alerts or detections label list
    ]
