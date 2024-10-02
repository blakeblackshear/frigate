import logging
import threading
from multiprocessing import Queue
from multiprocessing.synchronize import Event as MpEvent
from typing import Dict

from frigate.comms.events_updater import EventEndPublisher, EventUpdateSubscriber
from frigate.config import FrigateConfig
from frigate.events.types import EventStateEnum, EventTypeEnum
from frigate.models import Event
from frigate.util.builtin import to_relative_box

logger = logging.getLogger(__name__)


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


def should_update_state(prev_event: Event, current_event: Event) -> bool:
    """If current event should update state, but not necessarily update the db."""
    if prev_event["stationary"] != current_event["stationary"]:
        return True

    if prev_event["attributes"] != current_event["attributes"]:
        return True

    if prev_event["sub_label"] != current_event["sub_label"]:
        return True

    if len(prev_event["current_zones"]) < len(current_event["current_zones"]):
        return True

    return False


class EventProcessor(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        timeline_queue: Queue,
        stop_event: MpEvent,
    ):
        super().__init__(name="event_processor")
        self.config = config
        self.timeline_queue = timeline_queue
        self.events_in_process: Dict[str, Event] = {}
        self.stop_event = stop_event

        self.event_receiver = EventUpdateSubscriber()
        self.event_end_publisher = EventEndPublisher()

    def run(self) -> None:
        # set an end_time on events without an end_time on startup
        Event.update(end_time=Event.start_time + 30).where(
            Event.end_time == None
        ).execute()

        while not self.stop_event.is_set():
            update = self.event_receiver.check_for_update()

            if update == None:
                continue

            source_type, event_type, camera, event_data = update

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

                if event_type == EventStateEnum.start:
                    self.events_in_process[event_data["id"]] = event_data
                    continue

                self.handle_object_detection(event_type, camera, event_data)
            elif source_type == EventTypeEnum.api:
                self.timeline_queue.put(
                    (
                        camera,
                        source_type,
                        event_type,
                        {},
                        event_data,
                    )
                )

                self.handle_external_detection(event_type, event_data)

        self.event_receiver.stop()
        self.event_end_publisher.stop()
        logger.info("Exiting event processor...")

    def handle_object_detection(
        self,
        event_type: str,
        camera: str,
        event_data: Event,
    ) -> None:
        """handle tracked object event updates."""
        updated_db = False

        # if this is the first message, just store it and continue, its not time to insert it in the db
        if event_type == EventStateEnum.start:
            self.events_in_process[event_data["id"]] = event_data

        if should_update_db(self.events_in_process[event_data["id"]], event_data):
            updated_db = True
            camera_config = self.config.cameras[camera]
            width = camera_config.detect.width
            height = camera_config.detect.height
            first_detector = list(self.config.detectors.values())[0]

            start_time = event_data["start_time"]
            end_time = (
                None if event_data["end_time"] is None else event_data["end_time"]
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

            attributes = (
                None
                if event_data["snapshot"] is None
                else [
                    {
                        "box": to_relative_box(
                            width,
                            height,
                            a["box"],
                        ),
                        "label": a["label"],
                        "score": a["score"],
                    }
                    for a in event_data["snapshot"]["attributes"]
                ]
            )

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

        # check if the stored event_data should be updated
        if updated_db or should_update_state(
            self.events_in_process[event_data["id"]], event_data
        ):
            # update the stored copy for comparison on future update messages
            self.events_in_process[event_data["id"]] = event_data

        if event_type == EventStateEnum.end:
            del self.events_in_process[event_data["id"]]
            self.event_end_publisher.publish((event_data["id"], camera, updated_db))

    def handle_external_detection(
        self, event_type: EventStateEnum, event_data: Event
    ) -> None:
        if event_type == EventStateEnum.start:
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
                Event.data: {
                    "type": event_data["type"],
                    "score": event_data["score"],
                    "top_score": event_data["score"],
                },
            }
            Event.insert(event).execute()
        elif event_type == EventStateEnum.end:
            event = {
                Event.id: event_data["id"],
                Event.end_time: event_data["end_time"],
            }

            try:
                Event.update(event).where(Event.id == event_data["id"]).execute()
            except Exception:
                logger.warning(f"Failed to update manual event: {event_data['id']}")
