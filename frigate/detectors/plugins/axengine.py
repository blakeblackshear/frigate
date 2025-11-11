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

supported_models = {
    ModelTypeEnum.yologeneric: "frigate-yolov9-tiny",
}

model_cache_dir = os.path.join(MODEL_CACHE_DIR, "axengine_cache/")


class AxengineDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]

class Axengine(DetectionApi):
    type_key = DETECTOR_KEY
    def __init__(self, config: AxengineDetectorConfig):
        logger.info("__init__ axengine")
        super().__init__(config)
        self.height = config.model.height
        self.width = config.model.width
        model_path = config.model.path or "frigate-yolov9-tiny"

        model_props = self.parse_model_input(model_path)

        self.session = axe.InferenceSession(model_props["path"])

    def __del__(self):
        pass

    def parse_model_input(self, model_path):
        model_props = {}
        model_props["preset"] = True

        model_matched = False
        for model_type, pattern in supported_models.items():
            if re.match(pattern, model_path):
                model_matched = True
                model_props["model_type"] = model_type

        if model_matched:
            model_props["filename"] = model_path + f".axmodel"
            model_props["path"] = model_cache_dir + model_props["filename"]

        if not os.path.isfile(model_props["path"]):
            self.download_model(model_props["filename"])
        else:
            supported_models_str = ", ".join(
                model[1:-1] for model in supported_models
            )
            raise Exception(
                f"Model {model_path} is unsupported. Provide your own model or choose one of the following: {supported_models_str}"
            )
        return model_props

    def download_model(self, filename):
        if not os.path.isdir(model_cache_dir):
            os.mkdir(model_cache_dir)

        GITHUB_ENDPOINT = os.environ.get("GITHUB_ENDPOINT", "https://github.com")
        urllib.request.urlretrieve(
            f"{GITHUB_ENDPOINT}/ivanshi1108/assets/releases/download/v0.16.2/{filename}",
            model_cache_dir + filename,
        )

    def detect_raw(self, tensor_input):
        results = None
        results = self.session.run(None, {"images": tensor_input})
        if self.detector_config.model.model_type == ModelTypeEnum.yologeneric:
            return post_process_yolo(results, self.width, self.height)
        else:
            raise ValueError(
                f'Model type "{self.detector_config.model.model_type}" is currently not supported.'
            )

