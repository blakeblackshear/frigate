"""Facilitates communication between processes."""

import logging
from enum import Enum
from typing import Any

from .zmq_proxy import Publisher, Subscriber

logger = logging.getLogger(__name__)


class EventMetadataTypeEnum(str, Enum):
    all = ""
    manual_event_create = "manual_event_create"
    manual_event_end = "manual_event_end"
    regenerate_description = "regenerate_description"
    sub_label = "sub_label"
    attribute = "attribute"
    lpr_event_create = "lpr_event_create"
    save_lpr_snapshot = "save_lpr_snapshot"


class EventMetadataPublisher(Publisher):
    """Simplifies receiving event metadata."""

    topic_base = "event_metadata/"

    def __init__(self) -> None:
        super().__init__()

    def publish(self, payload: Any, sub_topic: str = "") -> None:
        super().publish(payload, sub_topic)


class EventMetadataSubscriber(Subscriber):
    """Simplifies receiving event metadata."""

    topic_base = "event_metadata/"

    def __init__(self, topic: EventMetadataTypeEnum) -> None:
        super().__init__(topic.value)

    def _return_object(
        self, topic: str, payload: tuple | None
    ) -> tuple[str, Any] | tuple[None, None]:
        if payload is None:
            return (None, None)

        return (topic, payload)
