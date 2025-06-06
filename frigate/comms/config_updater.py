"""Facilitates communication between processes."""

import multiprocessing as mp
from _pickle import UnpicklingError
from multiprocessing.synchronize import Event as MpEvent
from typing import Any

import zmq

SOCKET_PUB_SUB = "ipc:///tmp/cache/config"


class ConfigPublisher:
    """Publishes config changes to different processes."""

    def __init__(self) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PUB)
        self.socket.bind(SOCKET_PUB_SUB)
        self.stop_event: MpEvent = mp.Event()

    def publish(self, topic: str, payload: Any) -> None:
        """There is no communication back to the processes."""
        self.socket.send_string(topic, flags=zmq.SNDMORE)
        self.socket.send_pyobj(payload)

    def stop(self) -> None:
        self.stop_event.set()
        self.socket.close()
        self.context.destroy()


class ConfigSubscriber:
    """Simplifies receiving an updated config."""

    def __init__(self, topic: str, exact: bool = False) -> None:
        self.topic = topic
        self.exact = exact
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.SUB)
        self.socket.setsockopt_string(zmq.SUBSCRIBE, topic)
        self.socket.connect(SOCKET_PUB_SUB)

    def check_for_update(self) -> tuple[str, Any] | tuple[None, None]:
        """Returns updated config or None if no update."""
        try:
            topic = self.socket.recv_string(flags=zmq.NOBLOCK)
            obj = self.socket.recv_pyobj()

            if not self.exact or self.topic == topic:
                return (topic, obj)
            else:
                return (None, None)
        except (zmq.ZMQError, UnicodeDecodeError, UnpicklingError):
            return (None, None)

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()
