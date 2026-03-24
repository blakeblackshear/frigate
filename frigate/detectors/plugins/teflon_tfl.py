import logging

from pydantic import ConfigDict
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

from ..detector_utils import (
    tflite_detect_raw,
    tflite_init,
    tflite_load_delegate_interpreter,
)

logger = logging.getLogger(__name__)

# Use _tfl suffix to default tflite model
DETECTOR_KEY = "teflon_tfl"


class TeflonDetectorConfig(BaseDetectorConfig):
    """Teflon delegate detector for TFLite using Mesa Teflon delegate library to accelerate inference on supported GPUs."""

    model_config = ConfigDict(
        title="Teflon",
    )

    type: Literal[DETECTOR_KEY]


class TeflonTfl(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: TeflonDetectorConfig):
        # Location in Debian's mesa-teflon-delegate
        delegate_library = "/usr/lib/teflon/libteflon.so"
        device_config = {}

        interpreter = tflite_load_delegate_interpreter(
            delegate_library, detector_config, device_config
        )
        tflite_init(self, interpreter)

    def detect_raw(self, tensor_input):
        return tflite_detect_raw(self, tensor_input)
