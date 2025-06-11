"""Facilitates communication between processes for object detection signals."""

from .zmq_proxy import Publisher, Subscriber


class ObjectDetectorPublisher(Publisher):
    """Publishes signal for object detection to different processes."""

    topic_base = "object_detector/"


class ObjectDetectorSubscriber(Subscriber):
    """Simplifies receiving a signal for object detection."""

    topic_base = "object_detector/"

    def __init__(self, topic: str) -> None:
        super().__init__(topic)

    def check_for_update(self):
        return super().check_for_update(timeout=5)
