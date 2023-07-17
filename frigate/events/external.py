"""Handle external events created by the user."""

import base64
import datetime
import logging
import os
import random
import string
from multiprocessing import Queue
from typing import Optional

import cv2

from frigate.config import CameraConfig, FrigateConfig
from frigate.const import CLIPS_DIR
from frigate.events.maintainer import EventTypeEnum
from frigate.util.image import draw_box_with_label

logger = logging.getLogger(__name__)


class ExternalEventProcessor:
    def __init__(self, config: FrigateConfig, queue: Queue) -> None:
        self.config = config
        self.queue = queue
        self.default_thumbnail = None

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
        snapshot_frame: any,
    ) -> str:
        now = datetime.datetime.now().timestamp()
        camera_config = self.config.cameras.get(camera)

        # create event id and start frame time
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        event_id = f"{now}-{rand_id}"

        thumbnail = self._write_images(
            camera_config, label, event_id, draw, snapshot_frame
        )

        self.queue.put(
            (
                EventTypeEnum.api,
                "new",
                camera_config,
                {
                    "id": event_id,
                    "label": label,
                    "sub_label": sub_label,
                    "score": score,
                    "camera": camera,
                    "start_time": now - camera_config.record.events.pre_capture,
                    "end_time": now
                    + duration
                    + camera_config.record.events.post_capture
                    if duration is not None
                    else None,
                    "thumbnail": thumbnail,
                    "has_clip": camera_config.record.enabled and include_recording,
                    "has_snapshot": True,
                    "type": source_type,
                },
            )
        )

        return event_id

    def finish_manual_event(self, event_id: str, end_time: float) -> None:
        """Finish external event with indeterminate duration."""
        self.queue.put(
            (EventTypeEnum.api, "end", None, {"id": event_id, "end_time": end_time})
        )

    def _write_images(
        self,
        camera_config: CameraConfig,
        label: str,
        event_id: str,
        draw: dict[str, any],
        img_frame: any,
    ) -> str:
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
                x = box["box"][0] * camera_config.detect.width
                y = box["box"][1] * camera_config.detect.height
                width = box["box"][2] * camera_config.detect.width
                height = box["box"][3] * camera_config.detect.height

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
