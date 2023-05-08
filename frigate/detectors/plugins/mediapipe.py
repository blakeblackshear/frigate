import logging
import numpy as np

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig
from typing import Literal
from pydantic import Extra, Field

import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import cv2

logger = logging.getLogger(__name__)

DETECTOR_KEY = "mediapipe"

class MediapipeDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    #num_threads: int = Field(default=3, title="Number of detection threads")

class Mediapipe(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: MediapipeDetectorConfig):
        base_options = python.BaseOptions(model_asset_path=detector_config.model.path)
        options = vision.ObjectDetectorOptions(base_options=base_options,
                                            score_threshold=0.5)
        self.detector = vision.ObjectDetector.create_from_options(options)
        self.labels = detector_config.model.merged_labelmap

        self.h = detector_config.model.height
        self.w = detector_config.model.width
        logger.debug(f"Detection started. Model: {detector_config.model.path}, h: {self.h}, w: {self.w}")
        
    def get_label_index(self, label_value):
        if label_value.lower() == "truck":
            label_value = "car"
        for index, value in self.labels.items():
            if value == label_value.lower():
                return index
        return -1
    
    def detect_raw(self, tensor_input):
        # STEP 3: Load the input image.
        image_data = np.squeeze(tensor_input).astype(np.uint8)
        image_data_resized = cv2.resize(image_data, (self.w, self.h))
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_data_resized)

        # STEP 4: Detect objects in the input image.
        results = self.detector.detect(image)

        detections = np.zeros((20, 6), np.float32)

        for i, detection in enumerate(results.detections):
            if i == 20:
                break
            
            bbox = detection.bounding_box # left, upper, right, and lower pixel coordinate.
            category = detection.categories[0]
            label = self.get_label_index(category.category_name)
            if label < 0:
                logger.debug(f"Break due to unknown label")
                break
            detections[i] = [
                label,
                round(category.score, 2),
                bbox.origin_y / self.h,
                bbox.origin_x / self.w,
                (bbox.origin_y+bbox.height) / self.h,
                (bbox.origin_x+bbox.width) / self.w,
            ]
            logger.debug(f"Detection: raw: {detection} result: {detections[i]}")

            
        return detections