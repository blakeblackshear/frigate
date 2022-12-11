import logging
import numpy as np
import openvino.runtime as ov

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig
from typing import Literal
from pydantic import Extra, Field


logger = logging.getLogger(__name__)

DETECTOR_KEY = "openvino"


class OvDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    device: str = Field(default=None, title="Device Type")


class OvDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: OvDetectorConfig):
        self.ov_core = ov.Core()
        self.ov_model = self.ov_core.read_model(detector_config.model.path)

        self.interpreter = self.ov_core.compile_model(
            model=self.ov_model, device_name=detector_config.device
        )
        logger.info(f"Model Input Shape: {self.interpreter.input(0).shape}")
        self.output_indexes = 0
        while True:
            try:
                tensor_shape = self.interpreter.output(self.output_indexes).shape
                logger.info(f"Model Output-{self.output_indexes} Shape: {tensor_shape}")
                self.output_indexes += 1
            except:
                logger.info(f"Model has {self.output_indexes} Output Tensors")
                break

    def detect_raw(self, tensor_input):

        infer_request = self.interpreter.create_infer_request()
        infer_request.infer([tensor_input])

        results = infer_request.get_output_tensor()

        detections = np.zeros((20, 6), np.float32)
        i = 0
        for object_detected in results.data[0, 0, :]:
            if object_detected[0] != -1:
                logger.debug(object_detected)
            if object_detected[2] < 0.1 or i == 20:
                break
            detections[i] = [
                object_detected[1],  # Label ID
                float(object_detected[2]),  # Confidence
                object_detected[4],  # y_min
                object_detected[3],  # x_min
                object_detected[6],  # y_max
                object_detected[5],  # x_max
            ]
            i += 1

        return detections
