"""Facilitates communication over zmq proxy."""

import json
import threading
from typing import Generic, TypeVar

import zmq

from frigate.const import FAST_QUEUE_TIMEOUT

SOCKET_PUB = "ipc:///tmp/cache/proxy_pub"
SOCKET_SUB = "ipc:///tmp/cache/proxy_sub"


class ZmqProxyRunner(threading.Thread):
    def __init__(self, context: zmq.Context[zmq.Socket]) -> None:
        super().__init__(name="detection_proxy")
        self.context = context

    def run(self) -> None:
        """Run the proxy."""
        incoming = self.context.socket(zmq.XSUB)
        incoming.bind(SOCKET_PUB)
        outgoing = self.context.socket(zmq.XPUB)
        outgoing.bind(SOCKET_SUB)

        # Blocking: This will unblock (via exception) when we destroy the context
        # The incoming and outgoing sockets will be closed automatically
        # when the context is destroyed as well.
        try:
            zmq.proxy(incoming, outgoing)
        except zmq.ZMQError:
            pass


class ZmqProxy:
    """Proxies video and audio detections."""

    def __init__(self) -> None:
        self.context = zmq.Context()
        self.runner = ZmqProxyRunner(self.context)
        self.runner.start()

    def stop(self) -> None:
        # destroying the context will tell the proxy to stop
        self.context.destroy()
        self.runner.join()


T = TypeVar("T")


class Publisher(Generic[T]):
    """Publishes messages."""

    topic_base: str = ""

    def __init__(self, topic: str = "") -> None:
        self.topic = f"{self.topic_base}{topic}"
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PUB)
        self.socket.connect(SOCKET_PUB)

    def publish(self, payload: T, sub_topic: str = "") -> None:
        """Publish message."""
        self.socket.send_string(f"{self.topic}{sub_topic} {json.dumps(payload)}")

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()


class Subscriber(Generic[T]):
    """Receives messages."""

    topic_base: str = ""

    def __init__(self, topic: str = "") -> None:
        self.topic = f"{self.topic_base}{topic}"
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.SUB)
        self.socket.setsockopt_string(zmq.SUBSCRIBE, self.topic)
        self.socket.connect(SOCKET_SUB)

    def check_for_update(self, timeout: float | None = FAST_QUEUE_TIMEOUT) -> T | None:
        """Returns message or None if no update."""
        try:
            has_update, _, _ = zmq.select([self.socket], [], [], timeout)

            if has_update:
                parts = self.socket.recv_string(flags=zmq.NOBLOCK).split(maxsplit=1)
                return self._return_object(parts[0], json.loads(parts[1]))
        except zmq.ZMQError:
            pass

        return self._return_object("", None)

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()

    def _return_object(self, topic: str, payload: T | None) -> T | None:
        return payload
