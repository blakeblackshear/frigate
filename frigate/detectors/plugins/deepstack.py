import io
import logging

import numpy as np
import requests
from PIL import Image
from pydantic import ConfigDict, Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

logger = logging.getLogger(__name__)

DETECTOR_KEY = "deepstack"


class DeepstackDetectorConfig(BaseDetectorConfig):
    """DeepStack/CodeProject.AI detector that sends images to a remote DeepStack HTTP API for inference. Not recommended."""

    model_config = ConfigDict(
        title="DeepStack",
    )

    type: Literal[DETECTOR_KEY]
    api_url: str = Field(
        default="http://localhost:80/v1/vision/detection",
        title="DeepStack API URL",
        description="The URL of the DeepStack API.",
    )
    api_timeout: float = Field(
        default=0.1,
        title="DeepStack API timeout (in seconds)",
        description="Maximum time allowed for a DeepStack API request.",
    )
    api_key: str = Field(
        default="",
        title="DeepStack API key (if required)",
        description="Optional API key for authenticated DeepStack services.",
    )


class DeepStack(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: DeepstackDetectorConfig):
        self.api_url = detector_config.api_url
        self.api_timeout = detector_config.api_timeout
        self.api_key = detector_config.api_key
        self.labels = detector_config.model.merged_labelmap
        self.session = requests.Session()

    def get_label_index(self, label_value):
        if label_value.lower() == "truck":
            label_value = "car"
        for index, value in self.labels.items():
            if value == label_value.lower():
                return index
        return -1

    def detect_raw(self, tensor_input):
        image_data = np.squeeze(tensor_input).astype(np.uint8)
        image = Image.fromarray(image_data)
        self.w, self.h = image.size
        with io.BytesIO() as output:
            image.save(output, format="JPEG")
            image_bytes = output.getvalue()
        data = {"api_key": self.api_key}

        try:
            response = self.session.post(
                self.api_url,
                data=data,
                files={"image": image_bytes},
                timeout=self.api_timeout,
            )
        except requests.exceptions.RequestException as ex:
            logger.error("Error calling deepstack API: %s", ex)
            return np.zeros((20, 6), np.float32)

        response_json = response.json()
        detections = np.zeros((20, 6), np.float32)
        if response_json.get("predictions") is None:
            logger.debug(f"Error in parsing response json: {response_json}")
            return detections

        for i, detection in enumerate(response_json.get("predictions")):
            logger.debug(f"Response: {detection}")
            if detection["confidence"] < 0.4:
                logger.debug("Break due to confidence < 0.4")
                break
            label = self.get_label_index(detection["label"])
            if label < 0:
                logger.debug("Break due to unknown label")
                break
            detections[i] = [
                label,
                float(detection["confidence"]),
                detection["y_min"] / self.h,
                detection["x_min"] / self.w,
                detection["y_max"] / self.h,
                detection["x_max"] / self.w,
            ]

        return detections
