from abc import ABC, abstractmethod
from typing import Tuple

from numpy import ndarray

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
    def detect(self, frame: ndarray) -> list:
        """Detect motion and return motion boxes."""
        pass

    @abstractmethod
    def is_calibrating(self):
        """Return if motion is recalibrating."""
        pass

    @abstractmethod
    def update_mask(self) -> None:
        """Update the motion mask after a config change."""
        pass

    @abstractmethod
    def stop(self):
        """Stop any ongoing work and processes."""
        pass
