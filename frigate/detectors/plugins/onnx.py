import logging

import numpy as np
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig
from frigate.detectors.util import preprocess

logger = logging.getLogger(__name__)

DETECTOR_KEY = "onnx"


class ONNXDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]


class ONNXDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: ONNXDetectorConfig):
        try:
            import onnxruntime

            logger.info("ONNX: loaded onnxruntime module")
        except ModuleNotFoundError:
            logger.error(
                "ONNX: module loading failed, need 'pip install onnxruntime'?!?"
            )
            raise

        path = detector_config.model.path
        logger.info(f"ONNX: loading {detector_config.model.path}")
        self.model = onnxruntime.InferenceSession(path)
        logger.info(f"ONNX: {path} loaded")

    def detect_raw(self, tensor_input):
        model_input_name = self.model.get_inputs()[0].name
        model_input_shape = self.model.get_inputs()[0].shape
        tensor_input = preprocess(tensor_input, model_input_shape, np.float32)
        # ruff: noqa: F841
        tensor_output = self.model.run(None, {model_input_name: tensor_input})[0]

        raise Exception(
            "No models are currently supported via onnx. See the docs for more info."
        )
