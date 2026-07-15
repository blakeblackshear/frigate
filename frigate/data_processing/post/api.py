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
        model_runner: DataProcessorModelRunner | None,
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
    ) -> dict[str, Any] | str | None:
        """Handle metadata requests.
        Args:
            request_data (dict): containing data about requested change to process.

        Returns:
            None if request was not handled, otherwise return response.
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

    def refresh_idle_metrics(self) -> None:
        """Decay this processor's rate/speed gauges toward 0 while idle.

        process_data() only runs when there is a description to generate, so the
        rate gauge and the inference-speed EMA hold their last value when the
        processor is idle and the UI shows a stale inference time forever. The
        maintainer calls this every loop iteration; processors with gauges
        override it to re-read EventsPerSecond.eps() and zero the speed once the
        rate reaches 0. Default is a no-op.
        """
        pass
