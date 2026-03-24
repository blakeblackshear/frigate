import logging

from pydantic import ConfigDict, Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig
from frigate.log import suppress_stderr_during

from ..detector_utils import tflite_detect_raw, tflite_init

try:
    from tflite_runtime.interpreter import Interpreter
except ModuleNotFoundError:
    from ai_edge_litert.interpreter import Interpreter


logger = logging.getLogger(__name__)

DETECTOR_KEY = "cpu"


class CpuDetectorConfig(BaseDetectorConfig):
    """CPU TFLite detector that runs TensorFlow Lite models on the host CPU without hardware acceleration. Not recommended."""

    model_config = ConfigDict(
        title="CPU",
    )

    type: Literal[DETECTOR_KEY]
    num_threads: int = Field(
        default=3,
        title="Number of detection threads",
        description="The number of threads used for CPU-based inference.",
    )


class CpuTfl(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: CpuDetectorConfig):
        # Suppress TFLite delegate creation messages that bypass Python logging
        with suppress_stderr_during("tflite_interpreter_init"):
            interpreter = Interpreter(
                model_path=detector_config.model.path,
                num_threads=detector_config.num_threads or 3,
            )

        tflite_init(self, interpreter)

    def detect_raw(self, tensor_input):
        return tflite_detect_raw(self, tensor_input)
