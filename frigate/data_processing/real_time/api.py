"""Local only processors for handling real time object processing."""

import logging
from abc import ABC, abstractmethod
from typing import Any

import numpy as np

from frigate.config import FrigateConfig

from ..types import DataProcessorMetrics

logger = logging.getLogger(__name__)


class RealTimeProcessorApi(ABC):
    @abstractmethod
    def __init__(
        self,
        config: FrigateConfig,
        metrics: DataProcessorMetrics,
    ) -> None:
        self.config = config
        self.metrics = metrics
        pass

    @abstractmethod
    def process_frame(self, obj_data: dict[str, Any], frame: np.ndarray) -> None:
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
        self, topic: str, request_data: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Handle metadata requests.
        Args:
            topic (str): topic that dictates what work is requested.
            request_data (dict): containing data about requested change to process.

        Returns:
            None if request was not handled, otherwise return response.
        """
        pass

    @abstractmethod
    def expire_object(self, object_id: str, camera: str) -> None:
        """Handle objects that are no longer detected.
        Args:
            object_id (str): id of object that is no longer detected.
            camera (str): name of camera that object was detected on.

        Returns:
            None.
        """
        pass

    def update_config(self, topic: str, payload: Any) -> None:
        """Handle a config change notification.

        Called for every config update published under ``config/``.
        Processors should override this to check the topic and act only
        on changes relevant to them. Default is a no-op.

        Args:
            topic: The config topic that changed.
            payload: The updated configuration object.
        """
        pass
