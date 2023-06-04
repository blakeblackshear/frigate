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
        improve_contrast,
        threshold,
        contour_area,
    ):
        pass

    @abstractmethod
    def detect(self, frame):
        pass
