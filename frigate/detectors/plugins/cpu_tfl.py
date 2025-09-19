import logging

from pydantic import Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig
from frigate.log import redirect_output_to_logger

from ..detector_utils import tflite_detect_raw, tflite_init


logger = logging.getLogger(__name__)

DETECTOR_KEY = "cpu"


class CpuDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    num_threads: int = Field(default=3, title="Number of detection threads")


class CpuTfl(DetectionApi):
    type_key = DETECTOR_KEY

    @redirect_output_to_logger(logger, logging.DEBUG)
    def __init__(self, detector_config: CpuDetectorConfig):
        # Import TensorFlow Lite only when this detector is actually used
        try:
            from tflite_runtime.interpreter import Interpreter
        except ModuleNotFoundError:
            from tensorflow.lite.python.interpreter import Interpreter

        interpreter = Interpreter(
            model_path=detector_config.model.path,
            num_threads=detector_config.num_threads or 3,
        )

        tflite_init(self, interpreter)

    def detect_raw(self, tensor_input):
        return tflite_detect_raw(self, tensor_input)
