import os
import logging

from typing_extensions import Literal

import numpy as np
from synap import Network
from synap.types import Shape, Layout
from synap.preprocessor import Preprocessor
from synap.postprocessor import Detector

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum, InputTensorEnum

logger = logging.getLogger(__name__)

DETECTOR_KEY = "synaptics"


class SynapDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]

class SynapDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: SynapDetectorConfig):
        try:
            _, ext = os.path.splitext(detector_config.model.path)
            if ext and ext != ".synap":
                raise ValueError("Model path config for Synap1680 is wrong.")

            synap_network = Network(detector_config.model.path)
            logger.info(f"Synap NPU loaded model: {detector_config.model.path}")
        except ValueError as ve:
            logger.error(f"Config to Synap1680 was Failed: {ve}")
            raise
        except Exception as e:
            logger.error(f"Failed to init Synap NPU: {e}")
            raise
        
        self.width = detector_config.model.width
        self.height = detector_config.model.height
        self.model_type = detector_config.model.model_type
        self.network = synap_network
        self.network_input_details = self.network.inputs[0]
        self.input_tensor_layout = detector_config.model.input_tensor

        # Create Inference Engine
        self.preprocessor = Preprocessor()
        self.detector = Detector(score_threshold=0.4, iou_threshold=0.4)

    def detect_raw(self, tensor_input: np.ndarray):
        # It has only been testing for pre-converted mobilenet80 .tflite -> .synap model currently
        layout = Layout.nhwc  # default layout
        if self.input_tensor_layout == InputTensorEnum.nhwc:
            layout = Layout.nhwc
        
        postprocess_data = self.preprocessor.assign(self.network.inputs, tensor_input, Shape(tensor_input.shape), layout)
        output_tensor_obj = self.network.predict()
        output = self.detector.process(output_tensor_obj, postprocess_data)

        if self.model_type == ModelTypeEnum.ssd:
            detections = np.zeros((20, 6), np.float32)

            for i, item in enumerate(output.items):
                if i == 20:
                    break

                bb = item.bounding_box
                
                # Convert corner coordinates to normalized [0,1] range
                x1 = bb.origin.x / self.width  # Top-left X
                y1 = bb.origin.y / self.height  # Top-left Y
                x2 = (bb.origin.x + bb.size.x) / self.width  # Bottom-right X
                y2 = (bb.origin.y + bb.size.y) / self.height  # Bottom-right Y
                                
                detections[i] = [
                    item.class_index,
                    float(item.confidence),
                    y1,
                    x1,
                    y2,
                    x2,
                ]
                
            return detections
        else:
            print(f"Unsupported model type: {self.model_type}")
            return np.zeros((20, 6), np.float32)

