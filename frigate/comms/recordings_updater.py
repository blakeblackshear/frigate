"""Facilitates communication between processes."""

import logging
from enum import Enum
from typing import Any

from .zmq_proxy import Publisher, Subscriber

logger = logging.getLogger(__name__)


class RecordingsDataTypeEnum(str, Enum):
    all = ""
    recordings_available_through = "recordings_available_through"


class RecordingsDataPublisher(Publisher[tuple[str, float]]):
    """Publishes latest recording data."""

    topic_base = "recordings/"

    def __init__(self, topic: RecordingsDataTypeEnum) -> None:
        super().__init__(topic.value)

    def publish(self, payload: tuple[str, float], sub_topic: str = "") -> None:
        super().publish(payload, sub_topic)


class RecordingsDataSubscriber(Subscriber):
    """Receives latest recording data."""

    topic_base = "recordings/"

    def __init__(self, topic: RecordingsDataTypeEnum) -> None:
        super().__init__(topic.value)
