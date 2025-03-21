"""Facilitates communication between processes."""

import logging
from enum import Enum

from .zmq_proxy import Publisher, Subscriber

logger = logging.getLogger(__name__)


class EventMetadataTypeEnum(str, Enum):
    all = ""
    manual_event_create = "manual_event_create"
    manual_event_end = "manual_event_end"
    regenerate_description = "regenerate_description"
    sub_label = "sub_label"
    recognized_license_plate = "recognized_license_plate"
    lpr_event_create = "lpr_event_create"
    save_lpr_snapshot = "save_lpr_snapshot"


class EventMetadataPublisher(Publisher):
    """Simplifies receiving event metadata."""

    topic_base = "event_metadata/"

    def __init__(self) -> None:
        super().__init__()

    def publish(self, topic: EventMetadataTypeEnum, payload: any) -> None:
        super().publish(payload, topic.value)


class EventMetadataSubscriber(Subscriber):
    """Simplifies receiving event metadata."""

    topic_base = "event_metadata/"

    def __init__(self, topic: EventMetadataTypeEnum) -> None:
        super().__init__(topic.value)

    def check_for_update(self, timeout: float = 1) -> tuple | None:
        return super().check_for_update(timeout)

    def _return_object(self, topic: str, payload: tuple) -> tuple:
        if payload is None:
            return (None, None)

        topic = EventMetadataTypeEnum[topic[len(self.topic_base) :]]
        return (topic, payload)
