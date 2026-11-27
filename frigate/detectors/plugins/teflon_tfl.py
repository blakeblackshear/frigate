import logging
from typing import Literal

from pydantic import ConfigDict

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

from ..detector_utils import (
    TFLiteDetectionModel,
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
    supported_models = TFLiteDetectionModel.supported_models

    def __init__(self, detector_config: TeflonDetectorConfig):
        # Location in Debian's mesa-teflon-delegate
        delegate_library = "/usr/lib/teflon/libteflon.so"
        device_config = {}

        interpreter = tflite_load_delegate_interpreter(
            delegate_library, detector_config, device_config
        )
        self.tflite_model = TFLiteDetectionModel(
            interpreter, detector_config.model, DETECTOR_KEY
        )

    def detect_raw(self, tensor_input):
        return self.tflite_model.detect_raw(tensor_input)
