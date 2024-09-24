"""Facilitates communication between processes."""

import logging
from enum import Enum
from typing import Optional

from .zmq_proxy import Publisher, Subscriber

logger = logging.getLogger(__name__)


class EventMetadataTypeEnum(str, Enum):
    all = ""
    regenerate_description = "regenerate_description"


class EventMetadataPublisher(Publisher):
    """Simplifies receiving event metadata."""

    topic_base = "event_metadata/"

    def __init__(self, topic: EventMetadataTypeEnum) -> None:
        topic = topic.value
        super().__init__(topic)


class EventMetadataSubscriber(Subscriber):
    """Simplifies receiving event metadata."""

    topic_base = "event_metadata/"

    def __init__(self, topic: EventMetadataTypeEnum) -> None:
        topic = topic.value
        super().__init__(topic)

    def check_for_update(
        self, timeout: float = None
    ) -> Optional[tuple[EventMetadataTypeEnum, any]]:
        return super().check_for_update(timeout)

    def _return_object(self, topic: str, payload: any) -> any:
        if payload is None:
            return (None, None)
        return (EventMetadataTypeEnum[topic[len(self.topic_base) :]], payload)
