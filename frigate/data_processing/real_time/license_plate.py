"""Handle processing images for face detection and recognition."""

import logging

import numpy as np

from frigate.config import FrigateConfig
from frigate.data_processing.common.license_plate.mixin import (
    LicensePlateProcessingMixin,
)
from frigate.data_processing.common.license_plate.model import (
    LicensePlateModelRunner,
)

from ..types import DataProcessorMetrics
from .api import RealTimeProcessorApi

logger = logging.getLogger(__name__)


class LicensePlateRealTimeProcessor(LicensePlateProcessingMixin, RealTimeProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        metrics: DataProcessorMetrics,
        model_runner: LicensePlateModelRunner,
        detected_license_plates: dict[str, dict[str, any]],
    ):
        self.detected_license_plates = detected_license_plates
        self.model_runner = model_runner
        self.lpr_config = config.lpr
        self.config = config
        super().__init__(config, metrics)

    def process_frame(self, obj_data: dict[str, any], frame: np.ndarray):
        """Look for license plates in image."""
        self.lpr_process(obj_data, frame)

    def handle_request(self, topic, request_data) -> dict[str, any] | None:
        return

    def expire_object(self, object_id: str):
        if object_id in self.detected_license_plates:
            self.detected_license_plates.pop(object_id)
