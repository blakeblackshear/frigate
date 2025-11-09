import logging
import os.path
import re
import urllib.request
from typing import Literal

import cv2
import numpy as np
from pydantic import Field

from frigate.const import MODEL_CACHE_DIR
from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum
from frigate.util.model import post_process_yolo

import axengine as axe
from axengine import axclrt_provider_name, axengine_provider_name

logger = logging.getLogger(__name__)

DETECTOR_KEY = "axengine"

NUM_CLASSES = 80
CONF_THRESH = 0.65
IOU_THRESH = 0.45

class AxengineDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]

class Axengine(DetectionApi):
    type_key = DETECTOR_KEY
    def __init__(self, config: AxengineDetectorConfig):
        logger.info("__init__ axengine")
        super().__init__(config)
        self.height = config.model.height
        self.width = config.model.width
        model_path = config.model.path or "yolov9_320"
        self.session = axe.InferenceSession(f"/axmodels/{model_path}.axmodel")

    def __del__(self):
        pass

    def post_processing(self, raw_output, input_shape):
        """
        raw_output: [1, 1, 84, 8400]
        Returns: numpy array of shape (20, 6) [class_id, score, y_min, x_min, y_max, x_max] in normalized coordinates
        """
        results = np.zeros((20, 6), np.float32)

        try:
            if not isinstance(raw_output, np.ndarray):
                raw_output = np.array(raw_output)

            if len(raw_output.shape) == 4 and raw_output.shape[0] == 1 and raw_output.shape[1] == 1:
                raw_output = raw_output.squeeze(1)

            pred = raw_output[0].transpose(1, 0)

            bxy = pred[:, :2]
            bwh = pred[:, 2:4]
            cls = pred[:, 4:4 + NUM_CLASSES]

            cx = bxy[:, 0]
            cy = bxy[:, 1]
            w = bwh[:, 0]
            h = bwh[:, 1]

            x_min = cx - w / 2
            y_min = cy - h / 2
            x_max = cx + w / 2
            y_max = cy + h / 2

            scores = np.max(cls, axis=1)
            class_ids = np.argmax(cls, axis=1)

            mask = scores >= CONF_THRESH
            boxes = np.stack([x_min, y_min, x_max, y_max], axis=1)[mask]
            scores = scores[mask]
            class_ids = class_ids[mask]

            if len(boxes) == 0:
                return results

            boxes_nms = np.stack([x_min[mask], y_min[mask],
                                x_max[mask] - x_min[mask],
                                y_max[mask] - y_min[mask]], axis=1)

            indices = cv2.dnn.NMSBoxes(
                boxes_nms.tolist(),
                scores.tolist(),
                score_threshold=CONF_THRESH,
                nms_threshold=IOU_THRESH
            )

            if len(indices) == 0:
                return results

            indices = indices.flatten()

            sorted_indices = sorted(indices, key=lambda idx: scores[idx], reverse=True)
            indices = sorted_indices

            valid_detections = 0
            for i, idx in enumerate(indices):
                if i >= 20:
                    break

                x_min_val, y_min_val, x_max_val, y_max_val = boxes[idx]
                score = scores[idx]
                class_id = class_ids[idx]

                if score < CONF_THRESH:
                    continue

                results[valid_detections] = [
                    float(class_id),                     # class_id
                    float(score),                        # score
                    max(0, y_min_val) / input_shape[0],  # y_min
                    max(0, x_min_val) / input_shape[1],  # x_min
                    min(1, y_max_val / input_shape[0]),  # y_max
                    min(1, x_max_val / input_shape[1])   # x_max
                ]
                valid_detections += 1

            return results

        except Exception as e:
            return results

    def detect_raw(self, tensor_input):
        results = None
        results = self.session.run(None, {"images": tensor_input})
        return self.post_processing(results, (self.width, self.height))
