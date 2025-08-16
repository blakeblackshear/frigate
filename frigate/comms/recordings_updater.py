"""Facilitates communication between processes."""

import logging
from enum import Enum

from .zmq_proxy import Publisher, Subscriber

logger = logging.getLogger(__name__)


class RecordingsDataTypeEnum(str, Enum):
    all = ""
    recordings_available_through = "recordings_available_through"


class RecordingsDataPublisher(Publisher):
    """Publishes latest recording data."""

    topic_base = "recordings/"

    def __init__(self, topic: RecordingsDataTypeEnum) -> None:
        topic = topic.value
        super().__init__(topic)

    def publish(self, payload: tuple[str, float]) -> None:
        super().publish(payload)


class RecordingsDataSubscriber(Subscriber):
    """Receives latest recording data."""

    topic_base = "recordings/"

    def __init__(self, topic: RecordingsDataTypeEnum) -> None:
        topic = topic.value
        super().__init__(topic)
