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
                if prev_event_data is not None and event_data is not None:
                    self.handle_object_detection(
                        camera, event_type, prev_event_data, event_data
                    )
            elif input_type == EventTypeEnum.api:
                self.handle_api_entry(camera, event_type, event_data)

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
        event_id = event_data["id"]

        timeline_entry = {
            Timeline.timestamp: event_data["frame_time"],
            Timeline.camera: camera,
            Timeline.source: "tracked_object",
            Timeline.source_id: event_id,
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

        # update sub labels for existing entries that haven't been added yet
        if (
            prev_event_data != None
            and prev_event_data["sub_label"] != event_data["sub_label"]
            and event_id in self.pre_event_cache.keys()
        ):
            for e in self.pre_event_cache[event_id]:
                e[Timeline.data]["sub_label"] = event_data["sub_label"]

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
        elif event_type == "end":
            timeline_entry[Timeline.class_type] = "gone"
            save = True

        if save:
            self.insert_or_save(timeline_entry, prev_event_data, event_data)

    def handle_api_entry(
        self,
        camera: str,
        event_type: str,
        event_data: dict[any, any],
    ) -> bool:
        if event_type != "new":
            return False

        if event_data.get("type", "api") == "audio":
            timeline_entry = {
                Timeline.class_type: "heard",
                Timeline.timestamp: event_data["start_time"],
                Timeline.camera: camera,
                Timeline.source: "audio",
                Timeline.source_id: event_data["id"],
                Timeline.data: {
                    "label": event_data["label"],
                    "sub_label": event_data.get("sub_label"),
                },
            }
        else:
            timeline_entry = {
                Timeline.class_type: "external",
                Timeline.timestamp: event_data["start_time"],
                Timeline.camera: camera,
                Timeline.source: "api",
                Timeline.source_id: event_data["id"],
                Timeline.data: {
                    "label": event_data["label"],
                    "sub_label": event_data.get("sub_label"),
                },
            }

        Timeline.insert(timeline_entry).execute()
        return True
