"""Facilitates communication between processes."""

import os
import threading
from enum import Enum
from typing import Optional

import zmq

from frigate.const import (
    PORT_INTER_PROCESS_DETECTION_PUB,
    PORT_INTER_PROCESS_DETECTION_SUB,
)

SOCKET_CONTROL = "inproc://control.detections_updater"


class DetectionTypeEnum(str, Enum):
    all = ""
    video = "video"
    audio = "audio"


class DetectionProxyRunner(threading.Thread):

    def __init__(self, context: zmq.Context[zmq.Socket]) -> None:
        threading.Thread.__init__(self)
        self.name = "detection_proxy"
        self.context = context

    def run(self) -> None:
        """Run the proxy."""
        PUB_PORT = (
            os.environ.get("INTER_PROCESS_DETECTION_PUB_PORT")
            or PORT_INTER_PROCESS_DETECTION_PUB
        )
        SUB_PORT = (
            os.environ.get("INTER_PROCESS_DETECTION_SUB_PORT")
            or PORT_INTER_PROCESS_DETECTION_SUB
        )
        control = self.context.socket(zmq.SUB)
        control.connect(SOCKET_CONTROL)
        control.setsockopt_string(zmq.SUBSCRIBE, "")
        incoming = self.context.socket(zmq.XSUB)
        incoming.bind(f"tcp://127.0.0.1:{PUB_PORT}")
        outgoing = self.context.socket(zmq.XPUB)
        outgoing.bind(f"tcp://127.0.0.1:{SUB_PORT}")

        zmq.proxy_steerable(
            incoming, outgoing, None, control
        )  # blocking, will unblock terminate message is received
        incoming.close()
        outgoing.close()


class DetectionProxy:
    """Proxies video and audio detections."""

    def __init__(self) -> None:
        self.context = zmq.Context()
        self.control = self.context.socket(zmq.PUB)
        self.control.bind(SOCKET_CONTROL)
        self.runner = DetectionProxyRunner(self.context)
        self.runner.start()

    def stop(self) -> None:
        self.control.send_string("TERMINATE")  # tell the proxy to stop
        self.runner.join()
        self.context.destroy()


class DetectionPublisher:
    """Simplifies receiving video and audio detections."""

    def __init__(self, topic: DetectionTypeEnum) -> None:
        port = (
            os.environ.get("INTER_PROCESS_DETECTIONS_PORT")
            or PORT_INTER_PROCESS_DETECTION_PUB
        )
        self.topic = topic
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.PUB)
        self.socket.connect(f"tcp://127.0.0.1:{port}")

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
        port = (
            os.environ.get("INTER_PROCESS_DETECTIONS_PORT")
            or PORT_INTER_PROCESS_DETECTION_SUB
        )
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.SUB)
        self.socket.setsockopt_string(zmq.SUBSCRIBE, topic.value)
        self.socket.connect(f"tcp://127.0.0.1:{port}")

    def get_data(self) -> Optional[tuple[str, any]]:
        """Returns detections or None if no update."""
        try:
            topic = DetectionTypeEnum[self.socket.recv_string(flags=zmq.NOBLOCK)]
            return (topic, self.socket.recv_pyobj())
        except zmq.ZMQError:
            return (None, None)

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()
