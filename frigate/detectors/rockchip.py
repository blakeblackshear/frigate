"""Handles detection with rockchip TPUs."""

import logging

import numpy as np

from rknnlite.api import RKNNLite

from frigate.config import ModelConfig
from frigate.detectors.detection_api import DetectionApi

logger = logging.getLogger(__name__)


class RockchipDetector(DetectionApi):
    def __init__(
        self, det_device=None, model_config: ModelConfig = None, num_threads=1
    ):

        try:
            self.rknn = RKNNLite()
            self.rknn.load_rknn(
                model_config.path or "/precompiled_models/rockchip_rk1808_default.rknn"
            )
        except ValueError:
            logger.error(f"Not able to load rk model at {model_config.path}.")
            raise

        try:
            self.rknn.init_runtime("rk1808")
        except ValueError as e:
            logger.error(f"Not able to init rk model: {e}.")
            raise

    def detect_raw(self, tensor_input):
        self.rknn.inference(inputs=[tensor_input])
        # TODO figure out how to use the model output to get values
        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], tensor_input)
        self.interpreter.invoke()

        boxes = self.interpreter.tensor(self.tensor_output_details[0]["index"])()[0]
        class_ids = self.interpreter.tensor(self.tensor_output_details[1]["index"])()[0]
        scores = self.interpreter.tensor(self.tensor_output_details[2]["index"])()[0]
        count = int(
            self.interpreter.tensor(self.tensor_output_details[3]["index"])()[0]
        )

        detections = np.zeros((20, 6), np.float32)

        for i in range(count):
            if scores[i] < 0.4 or i == 20:
                break
            detections[i] = [
                class_ids[i],
                float(scores[i]),
                boxes[i][0],
                boxes[i][1],
                boxes[i][2],
                boxes[i][3],
            ]

        return detections
