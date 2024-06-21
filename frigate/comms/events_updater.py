"""Facilitates communication between processes."""

from frigate.events.types import EventStateEnum, EventTypeEnum

from .zmq_proxy import Publisher, Subscriber


class EventUpdatePublisher(Publisher):
    """Publishes events (objects, audio, manual)."""

    topic_base = "event/"

    def __init__(self) -> None:
        super().__init__("update")

    def publish(
        self, payload: tuple[EventTypeEnum, EventStateEnum, str, dict[str, any]]
    ) -> None:
        super().publish(payload)


class EventUpdateSubscriber(Subscriber):
    """Receives event updates."""

    topic_base = "event/"

    def __init__(self) -> None:
        super().__init__("update")


class EventEndPublisher(Publisher):
    """Publishes events that have ended."""

    topic_base = "event/"

    def __init__(self) -> None:
        super().__init__("finalized")

    def publish(
        self, payload: tuple[EventTypeEnum, EventStateEnum, str, dict[str, any]]
    ) -> None:
        super().publish(payload)


class EventEndSubscriber(Subscriber):
    """Receives events that have ended."""

    topic_base = "event/"

    def __init__(self) -> None:
        super().__init__("finalized")
