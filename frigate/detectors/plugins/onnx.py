import glob
import logging

import numpy as np
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig
from frigate.detectors.util import preprocess, yolov8_postprocess

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

        assert (
            detector_config.model.model_type == "yolov8"
        ), "ONNX: detector_config.model.model_type: only yolov8 supported"
        assert (
            detector_config.model.input_tensor == "nhwc"
        ), "ONNX: detector_config.model.input_tensor: only nhwc supported"
        if detector_config.model.input_pixel_format != "rgb":
            logger.warn(
                "ONNX: detector_config.model.input_pixel_format: should be 'rgb' for yolov8, but '{detector_config.model.input_pixel_format}' specified!"
            )

        assert detector_config.model.path is not None, (
            "ONNX: No model.path configured, please configure model.path and model.labelmap_path; some suggestions: "
            + ", ".join(glob.glob("/config/model_cache/yolov8/*.onnx"))
            + " and "
            + ", ".join(glob.glob("/config/model_cache/yolov8/*_labels.txt"))
        )

        path = detector_config.model.path
        logger.info(f"ONNX: loading {detector_config.model.path}")
        self.model = onnxruntime.InferenceSession(path)
        logger.info(f"ONNX: {path} loaded")

    def detect_raw(self, tensor_input):
        model_input_name = self.model.get_inputs()[0].name
        model_input_shape = self.model.get_inputs()[0].shape

        tensor_input = preprocess(tensor_input, model_input_shape, np.float32)

        tensor_output = self.model.run(None, {model_input_name: tensor_input})[0]

        return yolov8_postprocess(model_input_shape, tensor_output)
