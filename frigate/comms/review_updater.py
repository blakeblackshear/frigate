"""Facilitates communication between processes."""

import logging

from .zmq_proxy import Publisher, Subscriber

logger = logging.getLogger(__name__)


class RecordingsDataPublisher(Publisher[tuple[str, float]]):
    """Publishes review item data."""

    topic_base = "review/"

    def __init__(self, topic: str) -> None:
        super().__init__(topic)

    def publish(self, payload: tuple[str, float], sub_topic: str = "") -> None:
        super().publish(payload, sub_topic)


class RecordingsDataSubscriber(Subscriber):
    """Receives review item data."""

    topic_base = "review/"

    def __init__(self, topic: str) -> None:
        super().__init__(topic)