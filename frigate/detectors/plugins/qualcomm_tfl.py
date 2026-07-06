"""Qualcomm QNN TFLite delegate detector for Qualcomm NPU acceleration."""

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

# Use _tfl suffix to default to the bundled tflite model
DETECTOR_KEY = "qualcomm_tfl"


class QualcommDetectorConfig(BaseDetectorConfig):
    """Qualcomm NPU detector using the QNN TFLite delegate to accelerate inference on Qualcomm SoCs with a Hexagon NPU (e.g. IQ9100, QCS6490)."""

    model_config = ConfigDict(
        title="Qualcomm",
    )

    type: Literal[DETECTOR_KEY]


class QualcommTfl(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: QualcommDetectorConfig):
        # The QNN TFLite delegate library is provided by the host via CDI bind mounts
        delegate_library = "libQnnTFLiteDelegate.so"
        # Use the Hexagon Tensor Processor (HTP / NPU) backend
        device_config = {"backend_type": "htp"}

        interpreter = tflite_load_delegate_interpreter(
            delegate_library, detector_config, device_config
        )
        tflite_init(self, interpreter)

    def detect_raw(self, tensor_input):
        return tflite_detect_raw(self, tensor_input)
