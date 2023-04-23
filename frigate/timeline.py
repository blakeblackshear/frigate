"""Record events for object, audio, etc. detections."""

import logging
import threading
import queue

from enum import Enum

from frigate.config import FrigateConfig
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

    def __init__(
        self,
        config: FrigateConfig,
        queue: Queue,
        stop_event: MpEvent,
    ) -> None:
        threading.Thread.__init__(self)
        self.name = "timeline_processor"
        self.config = config
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
        camera_config = self.config.cameras[camera]

        if event_type == "start":
            Timeline.insert(
                timestamp=event_data["frame_time"],
                camera=camera,
                source="tracked_object",
                source_id=event_data["id"],
                class_type="visible",
                data={
                    "box": [
                        event_data["box"][0] / camera_config.detect.width,
                        event_data["box"][1] / camera_config.detect.height,
                        event_data["box"][2] / camera_config.detect.width,
                        event_data["box"][3] / camera_config.detect.height,
                    ],
                    "label": event_data["label"],
                    "region": [
                        event_data["region"][0] / camera_config.detect.width,
                        event_data["region"][1] / camera_config.detect.height,
                        event_data["region"][2] / camera_config.detect.width,
                        event_data["region"][3] / camera_config.detect.height,
                    ],
                },
            ).execute()
        elif (
            event_type == "update"
            and prev_event_data["current_zones"] != event_data["current_zones"]
            and len(event_data["current_zones"]) > 0
        ):
            Timeline.insert(
                timestamp=event_data["frame_time"],
                camera=camera,
                source="tracked_object",
                source_id=event_data["id"],
                class_type="entered_zone",
                data={
                    "box": [
                        event_data["box"][0] / camera_config.detect.width,
                        event_data["box"][1] / camera_config.detect.height,
                        event_data["box"][2] / camera_config.detect.width,
                        event_data["box"][3] / camera_config.detect.height,
                    ],
                    "label": event_data["label"],
                    "region": [
                        event_data["region"][0] / camera_config.detect.width,
                        event_data["region"][1] / camera_config.detect.height,
                        event_data["region"][2] / camera_config.detect.width,
                        event_data["region"][3] / camera_config.detect.height,
                    ],
                    "zones": event_data["current_zones"],
                },
            ).execute()
        elif event_type == "end":
            Timeline.insert(
                timestamp=event_data["frame_time"],
                camera=camera,
                source="tracked_object",
                source_id=event_data["id"],
                class_type="gone",
                data={
                    "box": [
                        event_data["box"][0] / camera_config.detect.width,
                        event_data["box"][1] / camera_config.detect.height,
                        event_data["box"][2] / camera_config.detect.width,
                        event_data["box"][3] / camera_config.detect.height,
                    ],
                    "label": event_data["label"],
                    "region": [
                        event_data["region"][0] / camera_config.detect.width,
                        event_data["region"][1] / camera_config.detect.height,
                        event_data["region"][2] / camera_config.detect.width,
                        event_data["region"][3] / camera_config.detect.height,
                    ],
                },
            ).execute()
