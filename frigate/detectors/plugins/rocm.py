import logging

import sys
import os
import numpy as np
import ctypes
from pydantic import Field
from typing_extensions import Literal
import glob

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

logger = logging.getLogger(__name__)

DETECTOR_KEY = "rocm"

class ROCmDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]

class ROCmDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: ROCmDetectorConfig):
        try:
            sys.path.append('/opt/rocm/lib')
            import migraphx

            logger.info(f"AMD/ROCm: loaded migraphx module")
        except ValueError:
            logger.error(
                "AMD/ROCm: module loading failed, missing ROCm environment?"
            )
            raise

        assert detector_config.model.path is not None, "No model.path configured, please configure model.path and model.labelmap_path; some suggestions: " + ', '.join(glob.glob("/*.onnx")) + " and " + ', '.join(glob.glob("/*_labels.txt"))
        path = detector_config.model.path
        os.makedirs("/config/model_cache/rocm", exist_ok=True)
        mxr_path = "/config/model_cache/rocm/" + os.path.basename(os.path.splitext(path)[0] + '.mxr')
        if os.path.exists(mxr_path):
            logger.info(f"AMD/ROCm: loading parsed model from {mxr_path}")
            self.model = migraphx.load(mxr_path)
        else:
            logger.info(f"AMD/ROCm: loading model from {path}")
            if path.endswith('.onnx'):
                self.model = migraphx.parse_onnx(path)
            elif path.endswith('.tf') or path.endswith('.tf2') or path.endswith('.tflite'):
                self.model = migraphx.parse_tf(path)
            else:
                raise Exception(f'AMD/ROCm: unkown model format {path}')
            logger.info(f"AMD/ROCm: compiling the model")
            self.model.compile(migraphx.get_target('gpu'), offload_copy=True, fast_math=True)
            logger.info(f"AMD/ROCm: saving parsed model into {mxr_path}")
            migraphx.save(self.model, mxr_path)
        logger.info(f"AMD/ROCm: model loaded")

    def detect_raw(self, tensor_input):
        model_input_name = self.model.get_parameter_names()[0];
        model_input_shape = tuple(self.model.get_parameter_shapes()[model_input_name].lens());

        # adapt to nchw/nhwc shape dynamically
        if (tensor_input.shape[0], tensor_input.shape[3], tensor_input.shape[1], tensor_input.shape[2]) == model_input_shape:
            tensor_input = np.transpose(tensor_input, (0, 3, 1, 2))

        assert tensor_input.shape == model_input_shape, f"invalid shapes for input ({tensor_input.shape}) and model ({model_input_shape}):"

        tensor_input = (1 / 255.0) * np.ascontiguousarray(tensor_input, dtype=np.float32)

        detector_result = self.model.run({model_input_name: tensor_input})[0]

        addr = ctypes.cast(detector_result.data_ptr(), ctypes.POINTER(ctypes.c_float))
        npr = np.ctypeslib.as_array(addr, shape=detector_result.get_shape().lens())

        model_box_count = npr.shape[2]
        model_class_count = npr.shape[1] - 4

        probs = npr[0, 4:, :]
        all_ids = np.argmax(probs, axis=0)
        all_confidences = np.take(probs.T, model_class_count*np.arange(0, model_box_count) + all_ids)
        all_boxes = npr[0, 0:4, :].T
        mask = (all_confidences > 0.25)
        class_ids = all_ids[mask]
        confidences = all_confidences[mask]
        cx, cy, w, h = all_boxes[mask].T

        detections = np.stack((class_ids, confidences, cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), axis=1)
        if detections.shape[0] > 20:
            logger.warn(f'Found {detections.shape[0]} boxes, discarding last {detections.shape[0] - 20} entries to limit to 20')
            # keep best confidences
            detections = detections[detections[:,1].argsort()[::-1]]
        detections.resize((20, 6))

        return detections

