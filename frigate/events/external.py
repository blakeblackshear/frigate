"""Handle external events created by the user."""

import base64
import datetime
import logging
import os
import random
import string
from enum import Enum
from typing import Optional

import cv2
from numpy import ndarray

from frigate.comms.detections_updater import DetectionPublisher, DetectionTypeEnum
from frigate.comms.events_updater import EventUpdatePublisher
from frigate.config import CameraConfig, FrigateConfig
from frigate.const import CLIPS_DIR
from frigate.events.types import EventStateEnum, EventTypeEnum
from frigate.util.image import draw_box_with_label

logger = logging.getLogger(__name__)


class ManualEventState(str, Enum):
    complete = "complete"
    start = "start"
    end = "end"


class ExternalEventProcessor:
    def __init__(self, config: FrigateConfig) -> None:
        self.config = config
        self.default_thumbnail = None
        self.event_sender = EventUpdatePublisher()
        self.detection_updater = DetectionPublisher(DetectionTypeEnum.api)
        self.event_camera = {}

    def create_manual_event(
        self,
        camera: str,
        label: str,
        source_type: str,
        sub_label: Optional[str],
        score: int,
        duration: Optional[int],
        include_recording: bool,
        draw: dict[str, any],
        snapshot_frame: Optional[ndarray],
    ) -> str:
        now = datetime.datetime.now().timestamp()
        camera_config = self.config.cameras.get(camera)

        # create event id and start frame time
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        event_id = f"{now}-{rand_id}"

        thumbnail = self._write_images(
            camera_config, label, event_id, draw, snapshot_frame
        )
        end = now + duration if duration is not None else None

        self.event_sender.publish(
            (
                EventTypeEnum.api,
                EventStateEnum.start,
                camera,
                "",
                {
                    "id": event_id,
                    "label": label,
                    "sub_label": sub_label,
                    "score": score,
                    "camera": camera,
                    "start_time": now - camera_config.record.event_pre_capture,
                    "end_time": end,
                    "thumbnail": thumbnail,
                    "has_clip": camera_config.record.enabled and include_recording,
                    "has_snapshot": True,
                    "type": source_type,
                },
            )
        )

        if source_type == "api":
            self.event_camera[event_id] = camera
            self.detection_updater.publish(
                (
                    camera,
                    now,
                    {
                        "state": (
                            ManualEventState.complete if end else ManualEventState.start
                        ),
                        "label": f"{label}: {sub_label}" if sub_label else label,
                        "event_id": event_id,
                        "end_time": end,
                    },
                )
            )

        return event_id

    def finish_manual_event(self, event_id: str, end_time: float) -> None:
        """Finish external event with indeterminate duration."""
        self.event_sender.publish(
            (
                EventTypeEnum.api,
                EventStateEnum.end,
                None,
                "",
                {"id": event_id, "end_time": end_time},
            )
        )

        if event_id in self.event_camera:
            self.detection_updater.publish(
                (
                    self.event_camera[event_id],
                    end_time,
                    {
                        "state": ManualEventState.end,
                        "event_id": event_id,
                        "end_time": end_time,
                    },
                )
            )
            self.event_camera.pop(event_id)

    def _write_images(
        self,
        camera_config: CameraConfig,
        label: str,
        event_id: str,
        draw: dict[str, any],
        img_frame: Optional[ndarray],
    ) -> Optional[str]:
        if not img_frame:
            return None

        # write clean snapshot if enabled
        if camera_config.snapshots.clean_copy:
            ret, png = cv2.imencode(".png", img_frame)

            if ret:
                with open(
                    os.path.join(
                        CLIPS_DIR,
                        f"{camera_config.name}-{event_id}-clean.png",
                    ),
                    "wb",
                ) as p:
                    p.write(png.tobytes())

        # write jpg snapshot with optional annotations
        if draw.get("boxes") and isinstance(draw.get("boxes"), list):
            for box in draw.get("boxes"):
                x = int(box["box"][0] * camera_config.detect.width)
                y = int(box["box"][1] * camera_config.detect.height)
                width = int(box["box"][2] * camera_config.detect.width)
                height = int(box["box"][3] * camera_config.detect.height)

                draw_box_with_label(
                    img_frame,
                    x,
                    y,
                    x + width,
                    y + height,
                    label,
                    f"{box.get('score', '-')}% {int(width * height)}",
                    thickness=2,
                    color=box.get("color", (255, 0, 0)),
                )

        ret, jpg = cv2.imencode(".jpg", img_frame)
        with open(
            os.path.join(CLIPS_DIR, f"{camera_config.name}-{event_id}.jpg"),
            "wb",
        ) as j:
            j.write(jpg.tobytes())

        # create thumbnail with max height of 175 and save
        width = int(175 * img_frame.shape[1] / img_frame.shape[0])
        thumb = cv2.resize(img_frame, dsize=(width, 175), interpolation=cv2.INTER_AREA)
        ret, jpg = cv2.imencode(".jpg", thumb)
        return base64.b64encode(jpg.tobytes()).decode("utf-8")

    def stop(self):
        self.event_sender.stop()
        self.detection_updater.stop()
