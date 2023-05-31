from abc import ABC, abstractmethod

from frigate.config import DetectConfig


class ObjectTracker(ABC):
    @abstractmethod
    def __init__(self, config: DetectConfig):
        pass

    @abstractmethod
    def match_and_update(self, detections):
        pass
