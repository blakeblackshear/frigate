import logging

import numpy as np
from PIL import Image
from pydantic import Field
from typing_extensions import Literal

from synap import Network
from synap.types import Shape, Layout, DataType
from synap.preprocessor import Preprocessor, InputData
from synap.postprocessor import Detector

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

try:
    from tflite_runtime.interpreter import Interpreter, load_delegate
except ModuleNotFoundError:
    from tensorflow.lite.python.interpreter import Interpreter, load_delegate


logger = logging.getLogger(__name__)

DETECTOR_KEY = "synap1680"

# normalize the final bbox boundry
def normalize_bbox(x, y, w, h, preproc_w, preproc_h) -> tuple[float, float, float, float]:
    x_norm = x / preproc_w
    y_norm = y / preproc_h
    w_norm = (x + w) / preproc_w
    h_norm = (y + h) / preproc_h
    return x_norm, y_norm, w_norm, h_norm

class SynapDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]

class SynapDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: SynapDetectorConfig):

        try:
            synap_network = Network(detector_config.model.path)
            logger.info("[INIT] NPU found")
        except Exception as e:
            logger.error(f"[INIT] Failed to init NPU: {e}")
            raise

        self.network = synap_network
        self.network_input_details = self.network.inputs[0]
        self.model_shape = self.network_input_details.shape
        self.model_dtype = self.network_input_details.data_type

    def detect_raw(self, tensor_input):
        detections = np.zeros((20, 6), np.float32)
        batch_size, height, width, channels = tensor_input.shape
        target_height, target_width = self.model_shape[1], self.model_shape[2]
        resized_tensors = []
        for i in range(batch_size):
            image = Image.fromarray(tensor_input[i])

            resized_image = image.resize((target_width, target_height))

            resized_tensor = np.array(resized_image)
            resized_tensors.append(resized_tensor)
            
            tensor_input = np.stack(resized_tensors)
            if tuple(tensor_input.shape) != tuple(self.model_shape):
                raise ValueError(f"diff shape {tensor_input.shape} {self.model_shape}")

            preprocessor = Preprocessor()
            detector = Detector()
            assigned_rect = preprocessor.assign(self.network.inputs, tensor_input, Shape(tensor_input.shape), Layout.nhwc)
            outputs = self.network.predict()
            result = detector.process(outputs, assigned_rect)
            
            detections = np.zeros((20, 6), np.float32)

            for i, item in enumerate(result.items):
                if i == 20:
                    break
                if float(item.confidence) < 0.4:
                    continue
                bb = item.bounding_box
                raw_x, raw_y, raw_w, raw_h = normalize_bbox(
                        bb.origin.x,
                        bb.origin.y,
                        bb.size.x,
                        bb.size.y,
                        assigned_rect.size.x,
                        assigned_rect.size.y
                )
                detections[i] = [
                    item.class_index,
                    float(item.confidence),
                    raw_y,
                    raw_x,
                    raw_h,
                    raw_w,
                ]
                
        return detections

