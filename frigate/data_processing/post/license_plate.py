"""Handle processing images for face detection and recognition."""

import datetime
import logging

from frigate.config import FrigateConfig
from frigate.data_processing.common.license_plate import (
    LicensePlateProcessingMixin,
)
from frigate.data_processing.common.license_plate_model import LicensePlateModelRunner
from frigate.data_processing.types import PostProcessDataEnum

from ..types import DataProcessorMetrics
from .api import PostProcessorApi

logger = logging.getLogger(__name__)


class LicensePlatePostProcessor(PostProcessorApi, LicensePlateProcessingMixin):
    def __init__(
        self,
        config: FrigateConfig,
        metrics: DataProcessorMetrics,
        model_runner: LicensePlateModelRunner,
    ):
        self.model_runner = model_runner
        self.lpr_config = config.lpr
        self.config = config
        super().__init__(config, metrics, model_runner)

    def __update_metrics(self, duration: float) -> None:
        """
        Update inference metrics.
        """
        self.metrics.alpr_pps.value = (self.metrics.alpr_pps.value * 9 + duration) / 10

    def process_data(
        self, data: dict[str, any], data_type: PostProcessDataEnum
    ) -> None:
        """Look for license plates in recording stream image
        Args:
            data (dict): containing data about the input.
            data_type (enum): Describing the data that is being processed.

        Returns:
            None.
        """

        start = datetime.datetime.now().timestamp()

        # self.lpr_process(obj_data, frame)

        self.__update_metrics(datetime.datetime.now().timestamp() - start)

    def handle_request(self, topic, request_data) -> dict[str, any] | None:
        return
