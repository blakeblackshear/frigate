import logging
from enum import Enum

from .detection_api import DetectionApi
from .detector_type import DetectorTypeEnum
from .cpu_tfl import CpuTfl
from .edgetpu_tfl import EdgeTpuTfl
from .openvino import OvDetector
from .config import ModelConfig, DetectorConfig


logger = logging.getLogger(__name__)


def create_detector(detector_config: DetectorConfig):
    _api_types = {
        DetectorTypeEnum.cpu: CpuTfl,
        DetectorTypeEnum.edgetpu: EdgeTpuTfl,
        DetectorTypeEnum.openvino: OvDetector,
    }

    if detector_config.type == DetectorTypeEnum.cpu:
        logger.warning(
            "CPU detectors are not recommended and should only be used for testing or for trial purposes."
        )

    api = _api_types.get(detector_config.type)
    if not api:
        raise ValueError(detector_config.type)
    return api(detector_config)
