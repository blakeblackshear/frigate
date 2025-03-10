from abc import ABC, abstractmethod
from typing import Tuple

from frigate.config import MotionConfig


class MotionDetector(ABC):
    @abstractmethod
    def __init__(
        self,
        frame_shape: Tuple[int, int, int],
        config: MotionConfig,
        fps: int,
        name: str = "abc",
        ptx_metrics=None,
    ):
        pass

    @abstractmethod
    def detect(self, frame):
        pass

    @abstractmethod
    def is_calibrating(self):
        pass

    @abstractmethod
    def stop(self):
        pass
