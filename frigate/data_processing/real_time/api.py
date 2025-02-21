"""Local only processors for handling real time object processing."""

import logging
from abc import ABC, abstractmethod

import numpy as np

from frigate.config import FrigateConfig

from ..types import DataProcessorMetrics, DataProcessorModelRunner

logger = logging.getLogger(__name__)


class RealTimeProcessorApi(ABC):
    @abstractmethod
    def __init__(
        self,
        config: FrigateConfig,
        metrics: DataProcessorMetrics,
        model_runner: DataProcessorModelRunner,
    ) -> None:
        self.config = config
        self.metrics = metrics
        self.model_runner = model_runner
        pass

    @abstractmethod
    def process_frame(self, obj_data: dict[str, any], frame: np.ndarray) -> None:
        """Processes the frame with object data.
        Args:
            obj_data (dict): containing data about focused object in frame.
            frame (ndarray): full yuv frame.

        Returns:
            None.
        """
        pass

    @abstractmethod
    def handle_request(
        self, topic: str, request_data: dict[str, any]
    ) -> dict[str, any] | None:
        """Handle metadata requests.
        Args:
            topic (str): topic that dictates what work is requested.
            request_data (dict): containing data about requested change to process.

        Returns:
            None if request was not handled, otherwise return response.
        """
        pass

    @abstractmethod
    def expire_object(self, object_id: str) -> None:
        """Handle objects that are no longer detected.
        Args:
            object_id (str): id of object that is no longer detected.

        Returns:
            None.
        """
        pass
