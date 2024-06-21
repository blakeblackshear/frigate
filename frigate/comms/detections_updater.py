"""Facilitates communication between processes."""

from enum import Enum
from typing import Optional

from .zmq_proxy import Publisher, Subscriber


class DetectionTypeEnum(str, Enum):
    all = ""
    api = "api"
    video = "video"
    audio = "audio"


class DetectionPublisher(Publisher):
    """Simplifies receiving video and audio detections."""

    topic_base = "detection/"

    def __init__(self, topic: DetectionTypeEnum) -> None:
        topic = topic.value
        super().__init__(topic)


class DetectionSubscriber(Subscriber):
    """Simplifies receiving video and audio detections."""

    topic_base = "detection/"

    def __init__(self, topic: DetectionTypeEnum) -> None:
        topic = topic.value
        super().__init__(topic)

    def check_for_update(
        self, timeout: float = None
    ) -> Optional[tuple[DetectionTypeEnum, any]]:
        return super().check_for_update(timeout)

    def _return_object(self, topic: str, payload: any) -> any:
        if payload is None:
            return (None, None)
        return (DetectionTypeEnum[topic[len(self.topic_base) :]], payload)
