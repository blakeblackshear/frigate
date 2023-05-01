"""Handle external events created by the user."""

import datetime
import logging
import random
import string

from typing import Optional

from multiprocessing.queues import Queue

from frigate.config import FrigateConfig
from frigate.events.maintainer import EventTypeEnum
from frigate.models import Event

logger = logging.getLogger(__name__)


class ExternalEventProcessor:
    def __init__(self, config: FrigateConfig, queue: Queue) -> None:
        self.config = config
        self.queue = queue

    def create_manual_event(
        self,
        camera: str,
        label: str,
        sub_label: str,
        duration: Optional[int],
        include_recording: bool,
    ) -> str:
        now = datetime.datetime.now().timestamp()
        camera_config = self.config.cameras.get(camera)

        # create event id and start frame time
        rand_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        event_id = f"{now}-{rand_id}"

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
                    "thumbnail": "",  # TODO create thumbnail icon
                    "has_clip": camera_config.record.enabled and include_recording,
                    "has_snapshot": False,  # TODO get snapshot frame passed in
                },
            )
        )

        return event_id

    def finish_manual_event(self, event_id: str):
        """Finish external event with indeterminate duration."""
        now = datetime.datetime.now().timestamp()
        self.queue.put((EventTypeEnum.api, "end", None, {"end_time": now}))
