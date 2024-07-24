"""Facilitates communication between processes."""

import multiprocessing as mp
from multiprocessing.synchronize import Event as MpEvent
from typing import Optional

import zmq

SOCKET_PUB_SUB = "ipc:///tmp/cache/config"


class ConfigPublisher:
    """Publishes config changes to different processes."""

    def __init__(self) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PUB)
        self.socket.bind(SOCKET_PUB_SUB)
        self.stop_event: MpEvent = mp.Event()

    def publish(self, topic: str, payload: any) -> None:
        """There is no communication back to the processes."""
        self.socket.send_string(topic, flags=zmq.SNDMORE)
        self.socket.send_json(payload)

    def stop(self) -> None:
        self.stop_event.set()
        self.socket.close()
        self.context.destroy()


class ConfigSubscriber:
    """Simplifies receiving an updated config."""

    def __init__(self, topic: str) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.SUB)
        self.socket.setsockopt_string(zmq.SUBSCRIBE, topic)
        self.socket.connect(SOCKET_PUB_SUB)

    def check_for_update(self) -> Optional[tuple[str, any]]:
        """Returns updated config or None if no update."""
        try:
            topic = self.socket.recv_string(flags=zmq.NOBLOCK)
            return (topic, self.socket.recv_json())
        except zmq.ZMQError:
            return (None, None)

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()
