import logging
import numpy as np

from .detection_api import DetectionApi
from .detector_type import DetectorTypeEnum


logger = logging.getLogger(__name__)


class TensorRT(DetectionApi):
    def __init__(self, det_device=None, model_config=None, num_threads=1, **kwargs):
        raise NotImplementedError("TensorRT engine is not yet functional!")

    def detect_raw(self, tensor_input):
        raise NotImplementedError("TensorRT engine is not yet functional!")


DetectionApi.register_api(DetectorTypeEnum.tensorrt, TensorRT)
