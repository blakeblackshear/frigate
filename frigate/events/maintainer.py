import datetime
import logging
import queue
import threading
from enum import Enum
from multiprocessing import Queue
from multiprocessing.synchronize import Event as MpEvent
from typing import Dict

from frigate.config import EventsConfig, FrigateConfig
from frigate.models import Event
from frigate.types import CameraMetricsTypes
from frigate.util.builtin import to_relative_box

logger = logging.getLogger(__name__)


class EventTypeEnum(str, Enum):
    api = "api"
    tracked_object = "tracked_object"


def should_update_db(prev_event: Event, current_event: Event) -> bool:
    """If current_event has updated fields and (clip or snapshot)."""
    if current_event["has_clip"] or current_event["has_snapshot"]:
        # if this is the first time has_clip or has_snapshot turned true
        if not prev_event["has_clip"] and not prev_event["has_snapshot"]:
            return True
        # or if any of the following values changed
        if (
            prev_event["top_score"] != current_event["top_score"]
            or prev_event["entered_zones"] != current_event["entered_zones"]
            or prev_event["thumbnail"] != current_event["thumbnail"]
            or prev_event["end_time"] != current_event["end_time"]
        ):
            return True
    return False


class EventProcessor(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        camera_processes: dict[str, CameraMetricsTypes],
        event_queue: Queue,
        event_processed_queue: Queue,
        timeline_queue: Queue,
        stop_event: MpEvent,
    ):
        threading.Thread.__init__(self)
        self.name = "event_processor"
        self.config = config
        self.camera_processes = camera_processes
        self.event_queue = event_queue
        self.event_processed_queue = event_processed_queue
        self.timeline_queue = timeline_queue
        self.events_in_process: Dict[str, Event] = {}
        self.stop_event = stop_event

    def run(self) -> None:
        # set an end_time on events without an end_time on startup
        Event.update(end_time=Event.start_time + 30).where(
            Event.end_time == None
        ).execute()

        while not self.stop_event.is_set():
            try:
                source_type, event_type, camera, event_data = self.event_queue.get(
                    timeout=1
                )
            except queue.Empty:
                continue

            logger.debug(
                f"Event received: {source_type} {event_type} {camera} {event_data['id']}"
            )

            if source_type == EventTypeEnum.tracked_object:
                self.timeline_queue.put(
                    (
                        camera,
                        source_type,
                        event_type,
                        self.events_in_process.get(event_data["id"]),
                        event_data,
                    )
                )

                if event_type == "start":
                    self.events_in_process[event_data["id"]] = event_data
                    continue

                self.handle_object_detection(event_type, camera, event_data)
            elif source_type == EventTypeEnum.api:
                self.handle_external_detection(event_type, event_data)

        # set an end_time on events without an end_time before exiting
        Event.update(end_time=datetime.datetime.now().timestamp()).where(
            Event.end_time == None
        ).execute()
        logger.info("Exiting event processor...")

    def handle_object_detection(
        self,
        event_type: str,
        camera: str,
        event_data: Event,
    ) -> None:
        """handle tracked object event updates."""
        # if this is the first message, just store it and continue, its not time to insert it in the db
        if should_update_db(self.events_in_process[event_data["id"]], event_data):
            camera_config = self.config.cameras[camera]
            event_config: EventsConfig = camera_config.record.events
            width = camera_config.detect.width
            height = camera_config.detect.height
            first_detector = list(self.config.detectors.values())[0]

            start_time = event_data["start_time"] - event_config.pre_capture
            end_time = (
                None
                if event_data["end_time"] is None
                else event_data["end_time"] + event_config.post_capture
            )
            # score of the snapshot
            score = (
                None
                if event_data["snapshot"] is None
                else event_data["snapshot"]["score"]
            )
            # detection region in the snapshot
            region = (
                None
                if event_data["snapshot"] is None
                else to_relative_box(
                    width,
                    height,
                    event_data["snapshot"]["region"],
                )
            )
            # bounding box for the snapshot
            box = (
                None
                if event_data["snapshot"] is None
                else to_relative_box(
                    width,
                    height,
                    event_data["snapshot"]["box"],
                )
            )

            attributes = [
                (
                    None
                    if event_data["snapshot"] is None
                    else {
                        "box": to_relative_box(
                            width,
                            height,
                            a["box"],
                        ),
                        "label": a["label"],
                        "score": a["score"],
                    }
                )
                for a in event_data["snapshot"]["attributes"]
            ]

            # keep these from being set back to false because the event
            # may have started while recordings and snapshots were enabled
            # this would be an issue for long running events
            if self.events_in_process[event_data["id"]]["has_clip"]:
                event_data["has_clip"] = True
            if self.events_in_process[event_data["id"]]["has_snapshot"]:
                event_data["has_snapshot"] = True

            event = {
                Event.id: event_data["id"],
                Event.label: event_data["label"],
                Event.camera: camera,
                Event.start_time: start_time,
                Event.end_time: end_time,
                Event.zones: list(event_data["entered_zones"]),
                Event.thumbnail: event_data["thumbnail"],
                Event.has_clip: event_data["has_clip"],
                Event.has_snapshot: event_data["has_snapshot"],
                Event.model_hash: first_detector.model.model_hash,
                Event.model_type: first_detector.model.model_type,
                Event.detector_type: first_detector.type,
                Event.data: {
                    "box": box,
                    "region": region,
                    "score": score,
                    "top_score": event_data["top_score"],
                    "attributes": attributes,
                    "type": "object",
                },
            }

            # only overwrite the sub_label in the database if it's set
            if event_data.get("sub_label") is not None:
                event[Event.sub_label] = event_data["sub_label"][0]
                event[Event.data]["sub_label_score"] = event_data["sub_label"][1]

            (
                Event.insert(event)
                .on_conflict(
                    conflict_target=[Event.id],
                    update=event,
                )
                .execute()
            )

            # update the stored copy for comparison on future update messages
            self.events_in_process[event_data["id"]] = event_data

        if event_type == "end":
            del self.events_in_process[event_data["id"]]
            self.event_processed_queue.put((event_data["id"], camera))

    def handle_external_detection(self, event_type: str, event_data: Event) -> None:
        if event_type == "new":
            event = {
                Event.id: event_data["id"],
                Event.label: event_data["label"],
                Event.sub_label: event_data["sub_label"],
                Event.camera: event_data["camera"],
                Event.start_time: event_data["start_time"],
                Event.end_time: event_data["end_time"],
                Event.thumbnail: event_data["thumbnail"],
                Event.has_clip: event_data["has_clip"],
                Event.has_snapshot: event_data["has_snapshot"],
                Event.zones: [],
                Event.data: {"type": event_data["type"]},
            }
            Event.insert(event).execute()
        elif event_type == "end":
            event = {
                Event.id: event_data["id"],
                Event.end_time: event_data["end_time"],
            }

            try:
                Event.update(event).where(Event.id == event_data["id"]).execute()
            except Exception:
                logger.warning(f"Failed to update manual event: {event_data['id']}")
