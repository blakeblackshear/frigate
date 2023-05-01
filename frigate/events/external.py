"""Handle external events created by the user."""

import base64
import cv2
import datetime
import glob
import logging
import os
import random
import string

from typing import Optional

from multiprocessing.queues import Queue

from frigate.config import CameraConfig, FrigateConfig
from frigate.const import CLIPS_DIR
from frigate.events.maintainer import EventTypeEnum

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
        sub_label: Optional[str],
        duration: Optional[int],
        include_recording: bool,
        snapshot_frame: any,
    ) -> str:
        now = datetime.datetime.now().timestamp()
        camera_config = self.config.cameras.get(camera)

        # create event id and start frame time
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        event_id = f"{now}-{rand_id}"

        self._write_snapshots(camera_config, event_id, snapshot_frame)

        if not self.default_thumbnail:
            self._calculate_thumbnail_bytes()

        self.queue.put(
            (
                EventTypeEnum.api,
                "new",
                camera_config,
                {
                    "id": event_id,
                    "label": label,
                    "sub_label": sub_label,
                    "camera": camera,
                    "start_time": now,
                    "end_time": now + duration if duration is not None else None,
                    "thumbnail": self.default_thumbnail,
                    "has_clip": camera_config.record.enabled and include_recording,
                    "has_snapshot": True,
                },
            )
        )

        return event_id

    def finish_manual_event(self, event_id: str) -> None:
        """Finish external event with indeterminate duration."""
        now = datetime.datetime.now().timestamp()
        self.queue.put(
            (EventTypeEnum.api, "end", None, {"id": event_id, "end_time": now})
        )

    def _calculate_thumbnail_bytes(self) -> None:
        error_image = glob.glob("/opt/frigate/frigate/images/external-event.png")

        if len(error_image) > 0:
            with open("/opt/frigate/frigate/images/external-event.png", "rb") as img:
                img_bytes = img.read()
                self.default_thumbnail = base64.b64encode(img_bytes).decode("utf-8")

    def _write_snapshots(
        self, camera_config: CameraConfig, event_id: str, img_bytes: any
    ) -> None:
        # write jpg snapshot
        ret, jpg = cv2.imencode(".jpg", img_bytes)
        with open(
            os.path.join(CLIPS_DIR, f"{camera_config.name}-{event_id}.jpg"),
            "wb",
        ) as j:
            j.write(jpg.tobytes())

        # write clean snapshot if enabled
        if camera_config.snapshots.clean_copy:
            ret, png = cv2.imencode(".png", img_bytes)

            if ret:
                with open(
                    os.path.join(
                        CLIPS_DIR,
                        f"{camera_config.name}-{event_id}-clean.png",
                    ),
                    "wb",
                ) as p:
                    p.write(png.tobytes())
