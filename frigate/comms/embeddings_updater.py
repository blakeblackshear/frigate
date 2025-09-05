"""Facilitates communication between processes."""

import logging
from enum import Enum
from typing import Any, Callable

import zmq

logger = logging.getLogger(__name__)


SOCKET_REP_REQ = "ipc:///tmp/cache/embeddings"


class EmbeddingsRequestEnum(Enum):
    # audio
    transcribe_audio = "transcribe_audio"
    # custom classification
    reload_classification_model = "reload_classification_model"
    # face
    clear_face_classifier = "clear_face_classifier"
    recognize_face = "recognize_face"
    register_face = "register_face"
    reprocess_face = "reprocess_face"
    # semantic search
    embed_description = "embed_description"
    embed_thumbnail = "embed_thumbnail"
    generate_search = "generate_search"
    reindex = "reindex"
    # LPR
    reprocess_plate = "reprocess_plate"
    # Review Descriptions
    summarize_review = "summarize_review"


class EmbeddingsResponder:
    def __init__(self) -> None:
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.REP)
        self.socket.bind(SOCKET_REP_REQ)

    def check_for_request(self, process: Callable) -> None:
        while True:  # load all messages that are queued
            has_message, _, _ = zmq.select([self.socket], [], [], 0.01)

            if not has_message:
                break

            try:
                raw = self.socket.recv_json(flags=zmq.NOBLOCK)

                if isinstance(raw, list):
                    (topic, value) = raw
                    response = process(topic, value)
                else:
                    logging.warning(
                        f"Received unexpected data type in ZMQ recv_json: {type(raw)}"
                    )
                    response = None

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

    def send_data(self, topic: str, data: Any) -> Any:
        """Sends data and then waits for reply."""
        try:
            self.socket.send_json((topic, data))
            return self.socket.recv_json()
        except zmq.ZMQError:
            return ""

    def stop(self) -> None:
        self.socket.close()
        self.context.destroy()
