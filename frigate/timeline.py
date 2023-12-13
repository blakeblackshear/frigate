"""Record events for object, audio, etc. detections."""

import logging
import queue
import threading
from multiprocessing import Queue
from multiprocessing.synchronize import Event as MpEvent

from frigate.config import FrigateConfig
from frigate.const import ALL_ATTRIBUTE_LABELS
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
        self.pre_event_cache: dict[str, list[dict[str, any]]] = {}

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

    def insert_or_save(
        self,
        entry: dict[str, any],
        prev_event_data: dict[any, any],
        event_data: dict[any, any],
    ) -> None:
        """Insert into db or cache."""
        id = entry[Timeline.source_id]
        if not event_data["has_clip"] and not event_data["has_snapshot"]:
            # the related event has not been saved yet, should be added to cache
            if id in self.pre_event_cache.keys():
                self.pre_event_cache[id].append(entry)
            else:
                self.pre_event_cache[id] = [entry]
        else:
            # the event is saved, insert to db and insert cached into db
            if id in self.pre_event_cache.keys():
                for e in self.pre_event_cache[id]:
                    Timeline.insert(e).execute()

                self.pre_event_cache.pop(id)

            Timeline.insert(entry).execute()

    def handle_object_detection(
        self,
        camera: str,
        event_type: str,
        prev_event_data: dict[any, any],
        event_data: dict[any, any],
    ) -> bool:
        """Handle object detection."""
        save = False
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
                "sub_label": event_data.get("sub_label"),
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
            save = True
        elif event_type == "update":
            if (
                len(prev_event_data["current_zones"]) < len(event_data["current_zones"])
                and not event_data["stationary"]
            ):
                timeline_entry[Timeline.class_type] = "entered_zone"
                timeline_entry[Timeline.data]["zones"] = event_data["current_zones"]
                save = True
            elif prev_event_data["stationary"] != event_data["stationary"]:
                timeline_entry[Timeline.class_type] = (
                    "stationary" if event_data["stationary"] else "active"
                )
                save = True
            elif prev_event_data["attributes"] == {} and event_data["attributes"] != {}:
                timeline_entry[Timeline.class_type] = "attribute"
                timeline_entry[Timeline.data]["attribute"] = list(
                    event_data["attributes"].keys()
                )[0]
                save = True
            elif not prev_event_data.get("sub_label") and event_data.get("sub_label"):
                sub_label = event_data["sub_label"][0]

                if sub_label not in ALL_ATTRIBUTE_LABELS:
                    timeline_entry[Timeline.class_type] = "sub_label"
                    timeline_entry[Timeline.data]["sub_label"] = sub_label
                    save = True
        elif event_type == "end":
            timeline_entry[Timeline.class_type] = "gone"
            save = True

        if save:
            self.insert_or_save(timeline_entry, prev_event_data, event_data)
