"""Record events for object, audio, etc. detections."""

import logging
import threading
import queue

from enum import Enum

from frigate.models import Timeline

from multiprocessing.queues import Queue
from multiprocessing.synchronize import Event as MpEvent

logger = logging.getLogger(__name__)


class TimelineSourceEnum(str, Enum):
    # api = "api"
    # audio = "audio"
    tracked_object = "tracked_object"


class TimelineProcessor(threading.Thread):
    """Handle timeline queue and update DB."""

    def __init__(self, queue: Queue, stop_event: MpEvent) -> None:
        threading.Thread.__init__(self)
        self.name = "timeline_processor"
        self.queue = queue
        self.stop_event = stop_event

    def run(self) -> None:
        while not self.stop_event.is_set():
            try:
                (
                    camera,
                    input_type,
                    event_type,
                    prev_event_data,
                    event_data,
                ) = self.queue.get(timeout=1)
            except queue.Empty:
                continue

            if input_type == TimelineSourceEnum.tracked_object:
                self.handle_object_detection(
                    camera, event_type, prev_event_data, event_data
                )

    def handle_object_detection(
        self,
        camera: str,
        event_type: str,
        prev_event_data: dict[any, any],
        event_data: dict[any, any],
    ) -> None:
        """Handle object detection."""
        if event_type == "start":
            Timeline.insert(
                timestamp=event_data["frame_time"],
                camera=camera,
                source="tracked_object",
                source_id=event_data["id"],
                class_type="visible",
                data={
                    "region": event_data["region"],
                    "box": event_data["box"],
                },
            )
        elif (
            event_type == "update"
            and prev_event_data["current_zones"] != event_data["current_zones"]
        ):
            Timeline.insert(
                timestamp=event_data["frame_time"],
                camera=camera,
                source="tracked_object",
                source_id=event_data["id"],
                class_type="entered_zone",
                data={
                    "region": event_data["region"],
                    "box": event_data["box"],
                    "zones": event_data["current_zones"],
                },
            )
        elif event_type == "end":
            Timeline.insert(
                timestamp=event_data["frame_time"],
                camera=camera,
                source="tracked_object",
                source_id=event_data["id"],
                class_type="gone",
                data={
                    "region": event_data["region"],
                    "box": event_data["box"],
                },
            )
