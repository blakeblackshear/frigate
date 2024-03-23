"""Facilitates communication between processes."""

import zmq

from frigate.events.types import EventStateEnum, EventTypeEnum

SOCKET_PUSH_PULL = "ipc:///tmp/cache/events"


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
        self.socket.send_pyobj(payload)

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
        """Returns updated config or None if no update."""
        try:
            has_update, _, _ = zmq.select([self.socket], [], [], timeout)

            if has_update:
                return self.socket.recv_pyobj()
        except zmq.ZMQError:
            pass

        return None

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()
