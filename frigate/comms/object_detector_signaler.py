"""Facilitates communication between processes for object detection signals."""

import threading

import zmq

SOCKET_PUB = "ipc:///tmp/cache/detector_pub"
SOCKET_SUB = "ipc:///tmp/cache/detector_sub"


class ZmqProxyRunner(threading.Thread):
    def __init__(self, context: zmq.Context[zmq.Socket]) -> None:
        super().__init__(name="detector_proxy")
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


class DetectorProxy:
    """Proxies object detection signals."""

    def __init__(self) -> None:
        self.context = zmq.Context()
        self.runner = ZmqProxyRunner(self.context)
        self.runner.start()

    def stop(self) -> None:
        # destroying the context will tell the proxy to stop
        self.context.destroy()
        self.runner.join()


class ObjectDetectorPublisher:
    """Publishes signal for object detection to different processes."""

    topic_base = "object_detector/"

    def __init__(self, topic: str = "") -> None:
        self.topic = f"{self.topic_base}{topic}"
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PUB)
        self.socket.connect(SOCKET_PUB)

    def publish(self, sub_topic: str = "") -> None:
        """Publish message."""
        self.socket.send_string(f"{self.topic}{sub_topic}/")

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()


class ObjectDetectorSubscriber:
    """Simplifies receiving a signal for object detection."""

    topic_base = "object_detector/"

    def __init__(self, topic: str = "") -> None:
        self.topic = f"{self.topic_base}{topic}/"
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.SUB)
        self.socket.setsockopt_string(zmq.SUBSCRIBE, self.topic)
        self.socket.connect(SOCKET_SUB)

    def check_for_update(self, timeout: float = 5) -> str | None:
        """Returns message or None if no update."""
        try:
            has_update, _, _ = zmq.select([self.socket], [], [], timeout)

            if has_update:
                return self.socket.recv_string(flags=zmq.NOBLOCK)
        except zmq.ZMQError:
            pass

        return None

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()
