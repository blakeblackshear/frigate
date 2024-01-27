import logging

import sys
import os
import numpy as np
import ctypes
from pydantic import Field
from typing_extensions import Literal
import glob
import cv2

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

import frigate.detectors.yolo_utils as yolo_utils

logger = logging.getLogger(__name__)

DETECTOR_KEY = "onnx"

class ONNXDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]

class ONNXDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: ONNXDetectorConfig):
        try:
            import onnxruntime

            logger.info(f"ONNX: loaded onnxruntime module")
        except ModuleNotFoundError:
            logger.error(
                "ONNX: module loading failed, need 'pip install onnxruntime'?!?"
            )
            raise

        assert detector_config.model.model_type == 'yolov8', "ONNX: detector_config.model.model_type: only yolov8 supported"
        assert detector_config.model.input_tensor == 'nhwc', "ONNX: detector_config.model.input_tensor: only nhwc supported"
        if detector_config.model.input_pixel_format != 'rgb':
            logger.warn("ONNX: detector_config.model.input_pixel_format: should be 'rgb' for yolov8, but '{detector_config.model.input_pixel_format}' specified!")

        assert detector_config.model.path is not None, "ONNX: no model.path configured, please configure model.path and model.labelmap_path; some suggestions: " + ', '.join(glob.glob("/*.onnx")) + " and " + ', '.join(glob.glob("/*_labels.txt"))

        path = detector_config.model.path
        logger.info(f"ONNX: loading {detector_config.model.path}")
        self.model = onnxruntime.InferenceSession(path)
        logger.info(f"ONNX: {path} loaded")

    def detect_raw(self, tensor_input):
        model_input_name = self.model.get_inputs()[0].name
        model_input_shape = self.model.get_inputs()[0].shape

        tensor_input = yolo_utils.yolov8_preprocess(tensor_input, model_input_shape)

        tensor_output = self.model.run(None, {model_input_name: tensor_input})[0]

        return yolo_utils.yolov8_postprocess(model_input_shape, tensor_output)

