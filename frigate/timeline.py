"""Record events for object, audio, etc. detections."""

import logging
import queue
import threading
from multiprocessing import Queue
from multiprocessing.synchronize import Event as MpEvent

from frigate.config import FrigateConfig
from frigate.events.maintainer import EventTypeEnum
from frigate.models import Timeline
from frigate.util.builtin import to_relative_box

logger = logging.getLogger(__name__)


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

            if input_type == EventTypeEnum.tracked_object:
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

        timeline_entry = {
            Timeline.timestamp: event_data["frame_time"],
            Timeline.camera: camera,
            Timeline.source: "tracked_object",
            Timeline.source_id: event_data["id"],
            Timeline.data: {
                "box": to_relative_box(
                    camera_config.detect.width,
                    camera_config.detect.height,
                    event_data["box"],
                ),
                "label": event_data["label"],
                "region": to_relative_box(
                    camera_config.detect.width,
                    camera_config.detect.height,
                    event_data["region"],
                ),
                "attribute": "",
            },
        }
        if event_type == "start":
            timeline_entry[Timeline.class_type] = "visible"
            Timeline.insert(timeline_entry).execute()
        elif event_type == "update":
            # zones have been updated
            if (
                prev_event_data["current_zones"] != event_data["current_zones"]
                and len(event_data["current_zones"]) > 0
                and not event_data["stationary"]
            ):
                timeline_entry[Timeline.class_type] = "entered_zone"
                timeline_entry[Timeline.data]["zones"] = event_data["current_zones"]
                Timeline.insert(timeline_entry).execute()
            elif prev_event_data["stationary"] != event_data["stationary"]:
                timeline_entry[Timeline.class_type] = (
                    "stationary" if event_data["stationary"] else "active"
                )
                Timeline.insert(timeline_entry).execute()
            elif prev_event_data["attributes"] == {} and event_data["attributes"] != {}:
                timeline_entry[Timeline.class_type] = "attribute"
                timeline_entry[Timeline.data]["attribute"] = list(
                    event_data["attributes"].keys()
                )[0]
                Timeline.insert(timeline_entry).execute()
        elif event_type == "end":
            if event_data["has_clip"] or event_data["has_snapshot"]:
                timeline_entry[Timeline.class_type] = "gone"
                Timeline.insert(timeline_entry).execute()
            else:
                # if event was not saved then the timeline entries should be deleted
                Timeline.delete().where(
                    Timeline.source_id == event_data["id"]
                ).execute()
