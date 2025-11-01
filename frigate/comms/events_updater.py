"""Facilitates communication between processes."""

from typing import Any

from frigate.events.types import EventStateEnum, EventTypeEnum

from .zmq_proxy import Publisher, Subscriber


class EventUpdatePublisher(
    Publisher[tuple[EventTypeEnum, EventStateEnum, str | None, str, dict[str, Any]]]
):
    """Publishes events (objects, audio, manual)."""

    topic_base = "event/"

    def __init__(self) -> None:
        super().__init__("update")

    def publish(
        self,
        payload: tuple[EventTypeEnum, EventStateEnum, str | None, str, dict[str, Any]],
        sub_topic: str = "",
    ) -> None:
        super().publish(payload, sub_topic)


class EventUpdateSubscriber(Subscriber):
    """Receives event updates."""

    topic_base = "event/"

    def __init__(self) -> None:
        super().__init__("update")


class EventEndPublisher(
    Publisher[tuple[EventTypeEnum, EventStateEnum, str, dict[str, Any]]]
):
    """Publishes events that have ended."""

    topic_base = "event/"

    def __init__(self) -> None:
        super().__init__("finalized")

    def publish(
        self,
        payload: tuple[EventTypeEnum, EventStateEnum, str, dict[str, Any]],
        sub_topic: str = "",
    ) -> None:
        super().publish(payload, sub_topic)


class EventEndSubscriber(Subscriber):
    """Receives events that have ended."""

    topic_base = "event/"

    def __init__(self) -> None:
        super().__init__("finalized")
