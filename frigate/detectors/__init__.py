import logging

from .detection_api import DetectionApi
from .detector_types import DetectorTypeEnum, api_types
from .config import ModelConfig, DetectorConfig


logger = logging.getLogger(__name__)


def create_detector(detector_config: DetectorConfig):
    if detector_config.type == DetectorTypeEnum.cpu:
        logger.warning(
            "CPU detectors are not recommended and should only be used for testing or for trial purposes."
        )

    api = api_types.get(detector_config.type)
    if not api:
        raise ValueError(detector_config.type)
    return api(detector_config)
