"""Local or remote processors to handle post processing."""

import logging
from abc import ABC, abstractmethod
from typing import Any

from frigate.config import FrigateConfig

from ..types import DataProcessorMetrics, DataProcessorModelRunner, PostProcessDataEnum

logger = logging.getLogger(__name__)


class PostProcessorApi(ABC):
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
    def process_data(
        self, data: dict[str, Any], data_type: PostProcessDataEnum
    ) -> None:
        """Processes the data of data type.
        Args:
            data (dict): containing data about the input.
            data_type (enum): Describing the data that is being processed.

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
            request_data (dict): containing data about requested change to process.

        Returns:
            None if request was not handled, otherwise return response.
        """
        pass
