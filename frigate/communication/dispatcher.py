"""Handle communication between frigate and other applications."""

from abc import ABC, abstractmethod

from frigate.config import FrigateConfig
from frigate.types import CameraMetricsTypes


class Communicator(ABC):
    """pub/sub model via specific protocol."""

    @abstractmethod
    def publish(topic: str, payload, retain: bool = False):
        """Send data via specific protocol."""
        pass

    @abstractmethod
    def subscribe(receiver):
        pass


class Dispatcher:
    """Handle communication between frigate and communicators."""

    def __init__(
        self,
        config: FrigateConfig,
        camera_metrics: dict[str, CameraMetricsTypes],
        communicators: list[Communicator],
    ) -> None:
        self.config = config
        self.camera_metrics = camera_metrics
        self.comms = communicators
