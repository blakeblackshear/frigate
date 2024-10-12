"""Facilitates communication between processes."""

from enum import Enum
from typing import Callable

import zmq

SOCKET_REP_REQ = "ipc:///tmp/cache/embeddings"


class EmbeddingsRequestEnum(Enum):
    embed_description = "embed_description"
    embed_thumbnail = "embed_thumbnail"
    generate_search = "generate_search"


class EmbeddingsResponder:
    def __init__(self) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.REP)
        self.socket.bind(SOCKET_REP_REQ)

    def check_for_request(self, process: Callable) -> None:
        while True:  # load all messages that are queued
            has_message, _, _ = zmq.select([self.socket], [], [], 0.1)

            if not has_message:
                break

            try:
                (topic, value) = self.socket.recv_json(flags=zmq.NOBLOCK)

                response = process(topic, value)

                if response is not None:
                    self.socket.send_json(response)
                else:
                    self.socket.send_json([])
            except zmq.ZMQError:
                break

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()


class EmbeddingsRequestor:
    """Simplifies sending data to EmbeddingsResponder and getting a reply."""

    def __init__(self) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.REQ)
        self.socket.connect(SOCKET_REP_REQ)

    def send_data(self, topic: str, data: any) -> str:
        """Sends data and then waits for reply."""
        try:
            self.socket.send_json((topic, data))
            return self.socket.recv_json()
        except zmq.ZMQError:
            return ""

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()
