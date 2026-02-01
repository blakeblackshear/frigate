"""Handle processing images to classify birds."""

import logging
import os
from typing import Any

import cv2
import numpy as np

from frigate.comms.event_metadata_updater import (
    EventMetadataPublisher,
    EventMetadataTypeEnum,
)
from frigate.config import FrigateConfig
from frigate.const import MODEL_CACHE_DIR
from frigate.log import suppress_stderr_during
from frigate.util.object import calculate_region

from ..types import DataProcessorMetrics
from .api import RealTimeProcessorApi

try:
    from tflite_runtime.interpreter import Interpreter
except ModuleNotFoundError:
    from tensorflow.lite.python.interpreter import Interpreter

logger = logging.getLogger(__name__)


class BirdRealTimeProcessor(RealTimeProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        sub_label_publisher: EventMetadataPublisher,
        metrics: DataProcessorMetrics,
    ):
        super().__init__(config, metrics)
        self.interpreter: Interpreter = None
        self.sub_label_publisher = sub_label_publisher
        self.tensor_input_details: dict[str, Any] = None
        self.tensor_output_details: dict[str, Any] = None
        self.detected_birds: dict[str, float] = {}
        self.labelmap: dict[int, str] = {}

        GITHUB_RAW_ENDPOINT = os.environ.get(
            "GITHUB_RAW_ENDPOINT", "https://raw.githubusercontent.com"
        )
        download_path = os.path.join(MODEL_CACHE_DIR, "bird")
        self.model_files = {
            "bird.tflite": f"{GITHUB_RAW_ENDPOINT}/google-coral/test_data/master/mobilenet_v2_1.0_224_inat_bird_quant.tflite",
            "birdmap.txt": f"{GITHUB_RAW_ENDPOINT}/google-coral/test_data/master/inat_bird_labels.txt",
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
        # Suppress TFLite delegate creation messages that bypass Python logging
        with suppress_stderr_during("tflite_interpreter_init"):
            self.interpreter = Interpreter(
                model_path=os.path.join(MODEL_CACHE_DIR, "bird/bird.tflite"),
                num_threads=2,
            )
            self.interpreter.allocate_tensors()
        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()

        i = 0

        with open(os.path.join(MODEL_CACHE_DIR, "bird/birdmap.txt")) as f:
            line = f.readline()
            while line:
                start = line.find("(")
                end = line.find(")")
                self.labelmap[i] = line[start + 1 : end]
                i += 1
                line = f.readline()

    def process_frame(self, obj_data, frame):
        if not self.interpreter:
            return

        if obj_data["label"] != "bird":
            return

        x, y, x2, y2 = calculate_region(
            frame.shape,
            obj_data["box"][0],
            obj_data["box"][1],
            obj_data["box"][2],
            obj_data["box"][3],
            int(
                max(
                    obj_data["box"][1] - obj_data["box"][0],
                    obj_data["box"][3] - obj_data["box"][2],
                )
                * 1.1
            ),
            1.0,
        )

        rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2RGB_I420)
        input = rgb[
            y:y2,
            x:x2,
        ]

        if input.shape != (224, 224):
            try:
                input = cv2.resize(input, (224, 224))
            except Exception:
                logger.warning("Failed to resize image for bird classification")
                return

        input = np.expand_dims(input, axis=0)
        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], input)
        self.interpreter.invoke()
        res: np.ndarray = self.interpreter.get_tensor(
            self.tensor_output_details[0]["index"]
        )[0]
        probs = res / res.sum(axis=0)
        best_id = np.argmax(probs)

        if best_id == 964:
            logger.debug("No bird classification was detected.")
            return

        score = round(probs[best_id], 2)

        if score < self.config.classification.bird.threshold:
            logger.debug(f"Score {score} is not above required threshold")
            return

        previous_score = self.detected_birds.get(obj_data["id"], 0.0)

        if score <= previous_score:
            logger.debug(f"Score {score} is worse than previous score {previous_score}")
            return

        self.sub_label_publisher.publish(
            (obj_data["id"], self.labelmap[best_id], score),
            EventMetadataTypeEnum.sub_label.value,
        )
        self.detected_birds[obj_data["id"]] = score

    def handle_request(self, topic, request_data):
        return None

    def expire_object(self, object_id, camera):
        if object_id in self.detected_birds:
            self.detected_birds.pop(object_id)
