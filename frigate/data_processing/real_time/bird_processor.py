"""Handle processing images to classify birds."""

import logging
import os

import cv2
import numpy as np

from frigate.config import FrigateConfig
from frigate.const import MODEL_CACHE_DIR
from frigate.util.object import calculate_region

from ..types import DataProcessorMetrics
from .api import RealTimeProcessorApi

try:
    from tflite_runtime.interpreter import Interpreter
except ModuleNotFoundError:
    from tensorflow.lite.python.interpreter import Interpreter

logger = logging.getLogger(__name__)


class BirdProcessor(RealTimeProcessorApi):
    def __init__(self, config: FrigateConfig, metrics: DataProcessorMetrics):
        super().__init__(config, metrics)
        self.interpreter: Interpreter = None
        self.tensor_input_details: dict[str, any] = None
        self.tensor_output_details: dict[str, any] = None
        self.detected_birds: dict[str, float] = {}

        download_path = os.path.join(MODEL_CACHE_DIR, "bird")
        self.model_files = {
            "bird.tflite": "https://raw.githubusercontent.com/google-coral/test_data/master/mobilenet_v2_1.0_224_inat_bird_quant.tflite",
            "birdmap.txt": "https://raw.githubusercontent.com/google-coral/test_data/master/inat_bird_labels.txt",
        }

        if not all(
            os.path.exists(os.path.join(download_path, n))
            for n in self.model_files.keys()
        ):
            # conditionally import ModelDownloader
            from frigate.util.downloader import ModelDownloader

            self.downloader = ModelDownloader(
                model_name="bird",
                download_path=download_path,
                file_names=self.model_files.keys(),
                download_func=self.__download_models,
                complete_func=self.__build_detector,
            )
            self.downloader.ensure_model_files()
        else:
            self.__build_detector()

    def __download_models(self, path: str) -> None:
        try:
            file_name = os.path.basename(path)

            # conditionally import ModelDownloader
            from frigate.util.downloader import ModelDownloader

            ModelDownloader.download_from_url(self.model_files[file_name], path)
        except Exception as e:
            logger.error(f"Failed to download {path}: {e}")

    def __build_detector(self) -> None:
        self.interpreter = Interpreter(
            model_path=os.path.join(MODEL_CACHE_DIR, "bird/bird.tflite"),
            num_threads=2,
        )
        self.interpreter.allocate_tensors()
        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()

    def process_frame(self, obj_data, frame):
        if obj_data["label"] != "bird":
            return

        x, y, x2, y2 = calculate_region(
            frame.shape,
            obj_data["box"][0],
            obj_data["box"][1],
            obj_data["box"][2],
            obj_data["box"][3],
            224,
            1.4,
        )

        rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2RGB_I420)
        input = rgb[
            y:y2,
            x:x2,
        ]

        logger.info(f"input shape is {input.shape}")
        cv2.imwrite("/media/frigate/test_class.png", input)

        input = np.expand_dims(input, axis=0)

        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], input)
        self.interpreter.invoke()
        res: np.ndarray = self.interpreter.get_tensor(self.tensor_output_details[0]["index"])[0]
        probs = res / res.sum(axis=0)
        best_id = np.argmax(probs)
        score = probs[best_id]

    def handle_request(self, request_data):
        return None

    def expire_object(self, object_id):
        pass
