"""Handle processing images for face detection and recognition."""

import logging
from typing import Any

import numpy as np

from frigate.comms.event_metadata_updater import EventMetadataPublisher
from frigate.comms.inter_process import InterProcessRequestor
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
        requestor: InterProcessRequestor,
        sub_label_publisher: EventMetadataPublisher,
        metrics: DataProcessorMetrics,
        model_runner: LicensePlateModelRunner,
        detected_license_plates: dict[str, dict[str, Any]],
    ):
        self.requestor = requestor
        self.detected_license_plates = detected_license_plates
        self.model_runner = model_runner
        self.lpr_config = config.lpr
        self.config = config
        self.sub_label_publisher = sub_label_publisher
        self.camera_current_cars: dict[str, list[str]] = {}
        super().__init__(config, metrics)

    CONFIG_UPDATE_TOPIC = "config/lpr"

    def update_config(self, topic: str, payload: Any) -> None:
        """Update LPR config at runtime."""
        if topic != self.CONFIG_UPDATE_TOPIC:
            return

        previous_min_area = self.config.lpr.min_area
        self.config.lpr = payload
        self.lpr_config = payload

        for camera_config in self.config.cameras.values():
            if camera_config.lpr.min_area == previous_min_area:
                camera_config.lpr.min_area = payload.min_area

        logger.debug("LPR config updated dynamically")

    def process_frame(
        self,
        obj_data: dict[str, Any],
        frame: np.ndarray,
        dedicated_lpr: bool = False,
    ) -> None:
        """Look for license plates in image."""
        self.lpr_process(obj_data, frame, dedicated_lpr)

    def handle_request(
        self, topic: str, request_data: dict[str, Any]
    ) -> dict[str, Any] | None:
        return None

    def expire_object(self, object_id: str, camera: str) -> None:
        """Expire lpr objects."""
        self.lpr_expire(object_id, camera)
