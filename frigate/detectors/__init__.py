import logging
from enum import Enum

from .detection_api import DetectionApi
from .cpu_tfl import CpuTfl
from .edgetpu_tfl import EdgeTpuTfl
from .openvino import OvDetector


logger = logging.getLogger(__name__)


class DetectorTypeEnum(str, Enum):
    edgetpu = "edgetpu"
    openvino = "openvino"
    cpu = "cpu"
    tensorrt = "tensorrt"


def create_detector(det_type: DetectorTypeEnum, **kwargs):
    _api_types = {
        DetectorTypeEnum.cpu: CpuTfl,
        DetectorTypeEnum.edgetpu: EdgeTpuTfl,
        DetectorTypeEnum.openvino: OvDetector,
    }

    if det_type == DetectorTypeEnum.cpu:
        logger.warning(
            "CPU detectors are not recommended and should only be used for testing or for trial purposes."
        )

    api = _api_types.get(det_type)
    if not api:
        raise ValueError(det_type)
    return api(**kwargs)
