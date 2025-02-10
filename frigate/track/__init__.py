from abc import ABC, abstractmethod

from frigate.config import DetectConfig


class ObjectTracker(ABC):
    @abstractmethod
    def __init__(self, config: DetectConfig) -> None:
        pass

    @abstractmethod
    def match_and_update(
        self, frame_name: str, frame_time: float, detections: list[dict[str, any]]
    ) -> None:
        pass
