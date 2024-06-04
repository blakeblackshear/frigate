"""Facilitates communication between processes."""

import threading
from enum import Enum
from typing import Optional

import zmq

SOCKET_CONTROL = "inproc://control.detections_updater"
SOCKET_PUB = "ipc:///tmp/cache/detect_pub"
SOCKET_SUB = "ipc:///tmp/cache/detect_sub"


class DetectionTypeEnum(str, Enum):
    all = ""
    api = "api"
    video = "video"
    audio = "audio"


class DetectionProxyRunner(threading.Thread):
    def __init__(self, context: zmq.Context[zmq.Socket]) -> None:
        threading.Thread.__init__(self)
        self.name = "detection_proxy"
        self.context = context

    def run(self) -> None:
        """Run the proxy."""
        control = self.context.socket(zmq.REP)
        control.connect(SOCKET_CONTROL)
        incoming = self.context.socket(zmq.XSUB)
        incoming.bind(SOCKET_PUB)
        outgoing = self.context.socket(zmq.XPUB)
        outgoing.bind(SOCKET_SUB)

        zmq.proxy_steerable(
            incoming, outgoing, None, control
        )  # blocking, will unblock terminate message is received
        incoming.close()
        outgoing.close()


class DetectionProxy:
    """Proxies video and audio detections."""

    def __init__(self) -> None:
        self.context = zmq.Context()
        self.control = self.context.socket(zmq.REQ)
        self.control.bind(SOCKET_CONTROL)
        self.runner = DetectionProxyRunner(self.context)
        self.runner.start()

    def stop(self) -> None:
        self.control.send("TERMINATE".encode())  # tell the proxy to stop
        self.runner.join()
        self.context.destroy()


class DetectionPublisher:
    """Simplifies receiving video and audio detections."""

    def __init__(self, topic: DetectionTypeEnum) -> None:
        self.topic = topic
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PUB)
        self.socket.connect(SOCKET_PUB)

    def send_data(self, payload: any) -> None:
        """Publish detection."""
        self.socket.send_string(self.topic.value, flags=zmq.SNDMORE)
        self.socket.send_pyobj(payload)

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()


class DetectionSubscriber:
    """Simplifies receiving video and audio detections."""

    def __init__(self, topic: DetectionTypeEnum) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.SUB)
        self.socket.setsockopt_string(zmq.SUBSCRIBE, topic.value)
        self.socket.connect(SOCKET_SUB)

    def get_data(self, timeout: float = None) -> Optional[tuple[str, any]]:
        """Returns detections or None if no update."""
        try:
            has_update, _, _ = zmq.select([self.socket], [], [], timeout)

            if has_update:
                topic = DetectionTypeEnum[self.socket.recv_string(flags=zmq.NOBLOCK)]
                return (topic, self.socket.recv_pyobj())
        except zmq.ZMQError:
            pass

        return (None, None)

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()
