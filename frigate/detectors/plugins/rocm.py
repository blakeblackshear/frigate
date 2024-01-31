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

DETECTOR_KEY = "rocm"

class ROCmDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    conserve_cpu: bool = Field(default=True, title="Conserve CPU at the expense of latency (and reduced max throughput)")

class ROCmDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: ROCmDetectorConfig):
        try:
            sys.path.append("/opt/rocm/lib")
            import migraphx

            logger.info(f"AMD/ROCm: loaded migraphx module")
        except ModuleNotFoundError:
            logger.error(
                "AMD/ROCm: module loading failed, missing ROCm environment?"
            )
            raise

        if detector_config.conserve_cpu:
            logger.info(f"AMD/ROCm: switching HIP to blocking mode to conserve CPU")
            ctypes.CDLL('/opt/rocm/lib/libamdhip64.so').hipSetDeviceFlags(4)
        assert detector_config.model.model_type == 'yolov8', "AMD/ROCm: detector_config.model.model_type: only yolov8 supported"
        assert detector_config.model.input_tensor == 'nhwc', "AMD/ROCm: detector_config.model.input_tensor: only nhwc supported"
        if detector_config.model.input_pixel_format != 'rgb':
            logger.warn("AMD/ROCm: detector_config.model.input_pixel_format: should be 'rgb' for yolov8, but '{detector_config.model.input_pixel_format}' specified!")

        assert detector_config.model.path is not None, "No model.path configured, please configure model.path and model.labelmap_path; some suggestions: " + ', '.join(glob.glob("/*.onnx")) + " and " + ', '.join(glob.glob("/*_labels.txt"))

        path = detector_config.model.path
        mxr_path = "/config/model_cache/rocm/" + os.path.basename(os.path.splitext(path)[0] + '.mxr')
        if path.endswith('.mxr'):
            logger.info(f"AMD/ROCm: loading parsed model from {mxr_path}")
            self.model = migraphx.load(mxr_path)
        elif os.path.exists(mxr_path):
            logger.info(f"AMD/ROCm: loading parsed model from {mxr_path}")
            self.model = migraphx.load(mxr_path)
        else:
            logger.info(f"AMD/ROCm: loading model from {path}")
            if path.endswith('.onnx'):
                self.model = migraphx.parse_onnx(path)
            elif path.endswith('.tf') or path.endswith('.tf2') or path.endswith('.tflite'):
                # untested
                self.model = migraphx.parse_tf(path)
            else:
                raise Exception(f"AMD/ROCm: unkown model format {path}")
            logger.info(f"AMD/ROCm: compiling the model")
            self.model.compile(migraphx.get_target('gpu'), offload_copy=True, fast_math=True)
            logger.info(f"AMD/ROCm: saving parsed model into {mxr_path}")
            os.makedirs("/config/model_cache/rocm", exist_ok=True)
            migraphx.save(self.model, mxr_path)
        logger.info(f"AMD/ROCm: model loaded")

    def detect_raw(self, tensor_input):
        model_input_name = self.model.get_parameter_names()[0];
        model_input_shape = tuple(self.model.get_parameter_shapes()[model_input_name].lens());

        tensor_input = yolo_utils.yolov8_preprocess(tensor_input, model_input_shape)

        detector_result = self.model.run({model_input_name: tensor_input})[0]

        addr = ctypes.cast(detector_result.data_ptr(), ctypes.POINTER(ctypes.c_float))
        tensor_output = np.ctypeslib.as_array(addr, shape=detector_result.get_shape().lens())

        return yolo_utils.yolov8_postprocess(model_input_shape, tensor_output)

