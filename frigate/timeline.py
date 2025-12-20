"""Record events for object, audio, etc. detections."""

import logging
import queue
import threading
from multiprocessing import Queue
from multiprocessing.synchronize import Event as MpEvent
from typing import Any

from frigate.config import FrigateConfig
from frigate.events.maintainer import EventStateEnum, EventTypeEnum
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
        super().__init__(name="timeline_processor")
        self.config = config
        self.queue = queue
        self.stop_event = stop_event
        self.pre_event_cache: dict[str, list[dict[str, Any]]] = {}

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
                # None prev_event_data is only allowed for the start of an event
                if event_type != EventStateEnum.start and prev_event_data is None:
                    continue

                self.handle_object_detection(
                    camera, event_type, prev_event_data, event_data
                )
            elif input_type == EventTypeEnum.api:
                self.handle_api_entry(camera, event_type, event_data)

    def insert_or_save(
        self,
        entry: dict[str, Any],
        prev_event_data: dict[Any, Any],
        event_data: dict[Any, Any],
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
        prev_event_data: dict[Any, Any],
        event_data: dict[Any, Any],
    ) -> bool:
        """Handle object detection."""
        camera_config = self.config.cameras[camera]
        event_id = event_data["id"]

        # Base timeline entry data that all entries will share
        base_entry = {
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
                "score": event_data["score"],
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

        if event_type == EventStateEnum.start:
            timeline_entry = base_entry.copy()
            timeline_entry[Timeline.class_type] = "visible"
            self.insert_or_save(timeline_entry, prev_event_data, event_data)
        elif event_type == EventStateEnum.update:
            # Check all conditions and create timeline entries for each change
            entries_to_save = []

            # Check for zone changes
            prev_zones = set(prev_event_data["current_zones"])
            current_zones = set(event_data["current_zones"])
            zones_changed = prev_zones != current_zones

            # Only save "entered_zone" events when the object is actually IN zones
            if (
                zones_changed
                and not event_data["stationary"]
                and len(current_zones) > 0
            ):
                zone_entry = base_entry.copy()
                zone_entry[Timeline.class_type] = "entered_zone"
                zone_entry[Timeline.data] = base_entry[Timeline.data].copy()
                zone_entry[Timeline.data]["zones"] = event_data["current_zones"]
                entries_to_save.append(zone_entry)

            # Check for stationary status change
            if prev_event_data["stationary"] != event_data["stationary"]:
                stationary_entry = base_entry.copy()
                stationary_entry[Timeline.class_type] = (
                    "stationary" if event_data["stationary"] else "active"
                )
                stationary_entry[Timeline.data] = base_entry[Timeline.data].copy()
                entries_to_save.append(stationary_entry)

            # Check for new attributes
            if prev_event_data["attributes"] == {} and event_data["attributes"] != {}:
                attribute_entry = base_entry.copy()
                attribute_entry[Timeline.class_type] = "attribute"
                attribute_entry[Timeline.data] = base_entry[Timeline.data].copy()
                attribute_entry[Timeline.data]["attribute"] = list(
                    event_data["attributes"].keys()
                )[0]

                if len(event_data["current_attributes"]) > 0:
                    attribute_entry[Timeline.data]["attribute_box"] = to_relative_box(
                        camera_config.detect.width,
                        camera_config.detect.height,
                        event_data["current_attributes"][0]["box"],
                    )

                entries_to_save.append(attribute_entry)

            # Save all entries
            for entry in entries_to_save:
                self.insert_or_save(entry, prev_event_data, event_data)

        elif event_type == EventStateEnum.end:
            timeline_entry = base_entry.copy()
            timeline_entry[Timeline.class_type] = "gone"
            self.insert_or_save(timeline_entry, prev_event_data, event_data)

    def handle_api_entry(
        self,
        camera: str,
        event_type: str,
        event_data: dict[Any, Any],
    ) -> bool:
        if event_type != "start":
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
