"""Facilitates communication between processes."""

import zmq

from frigate.events.types import EventStateEnum, EventTypeEnum

SOCKET_PUSH_PULL = "ipc:///tmp/cache/events"
SOCKET_PUSH_PULL_END = "ipc:///tmp/cache/events_ended"


class EventUpdatePublisher:
    """Publishes events (objects, audio, manual)."""

    def __init__(self) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PUSH)
        self.socket.connect(SOCKET_PUSH_PULL)

    def publish(
        self, payload: tuple[EventTypeEnum, EventStateEnum, str, dict[str, any]]
    ) -> None:
        """There is no communication back to the processes."""
        self.socket.send_json(payload)

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()


class EventUpdateSubscriber:
    """Receives event updates."""

    def __init__(self) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PULL)
        self.socket.bind(SOCKET_PUSH_PULL)

    def check_for_update(
        self, timeout=1
    ) -> tuple[EventTypeEnum, EventStateEnum, str, dict[str, any]]:
        """Returns events or None if no update."""
        try:
            has_update, _, _ = zmq.select([self.socket], [], [], timeout)

            if has_update:
                return self.socket.recv_json()
        except zmq.ZMQError:
            pass

        return None

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()


class EventEndPublisher:
    """Publishes events that have ended."""

    def __init__(self) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PUSH)
        self.socket.connect(SOCKET_PUSH_PULL_END)

    def publish(
        self, payload: tuple[EventTypeEnum, EventStateEnum, str, dict[str, any]]
    ) -> None:
        """There is no communication back to the processes."""
        self.socket.send_json(payload)

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()


class EventEndSubscriber:
    """Receives events that have ended."""

    def __init__(self) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PULL)
        self.socket.bind(SOCKET_PUSH_PULL_END)

    def check_for_update(
        self, timeout=1
    ) -> tuple[EventTypeEnum, EventStateEnum, str, dict[str, any]]:
        """Returns events ended or None if no update."""
        try:
            has_update, _, _ = zmq.select([self.socket], [], [], timeout)

            if has_update:
                return self.socket.recv_json()
        except zmq.ZMQError:
            pass

        return None

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()
