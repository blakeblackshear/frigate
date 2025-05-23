"""Real time processor that works with classification tflite models."""

import logging
from typing import Any

import cv2
import numpy as np

from frigate.comms.event_metadata_updater import (
    EventMetadataPublisher,
    EventMetadataTypeEnum,
)
from frigate.config import FrigateConfig
from frigate.config.classification import CustomClassificationConfig
from frigate.util.builtin import load_labels
from frigate.util.object import calculate_region

from ..types import DataProcessorMetrics
from .api import RealTimeProcessorApi

try:
    from tflite_runtime.interpreter import Interpreter
except ModuleNotFoundError:
    from tensorflow.lite.python.interpreter import Interpreter

logger = logging.getLogger(__name__)


class CustomStateClassificationProcessor(RealTimeProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        model_config: CustomClassificationConfig,
        metrics: DataProcessorMetrics,
    ):
        super().__init__(config, metrics)
        self.model_config = model_config
        self.interpreter: Interpreter = None
        self.tensor_input_details: dict[str, Any] = None
        self.tensor_output_details: dict[str, Any] = None
        self.labelmap: dict[int, str] = {}
        self.__build_detector()

    def __build_detector(self) -> None:
        self.interpreter = Interpreter(
            model_path=self.model_config.model_path,
            num_threads=2,
        )
        self.interpreter.allocate_tensors()
        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()
        self.labelmap = load_labels(self.model_config.labelmap_path, prefill=0)

    def process_frame(self, frame_data: dict[str, Any], frame: np.ndarray):
        camera = frame_data.get("camera")
        if camera not in self.model_config.state_config.cameras:
            return

        camera_config = self.model_config.state_config.cameras[camera]
        x, y, x2, y2 = calculate_region(
            frame.shape,
            camera_config.crop[0],
            camera_config.crop[1],
            camera_config.crop[2],
            camera_config.crop[3],
            224,
            1.0,
        )

        rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2RGB_I420)
        input = rgb[
            y:y2,
            x:x2,
        ]

        if input.shape != (224, 224):
            input = cv2.resize(input, (224, 224))

        input = np.expand_dims(input, axis=0)
        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], input)
        self.interpreter.invoke()
        res: np.ndarray = self.interpreter.get_tensor(
            self.tensor_output_details[0]["index"]
        )[0]
        print(f"the gate res is {res}")
        probs = res / res.sum(axis=0)
        best_id = np.argmax(probs)
        score = round(probs[best_id], 2)

        print(f"got {self.labelmap[best_id]} with score {score}")

    def handle_request(self, topic, request_data):
        return None

    def expire_object(self, object_id, camera):
        pass


class CustomObjectClassificationProcessor(RealTimeProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        model_config: CustomClassificationConfig,
        sub_label_publisher: EventMetadataPublisher,
        metrics: DataProcessorMetrics,
    ):
        super().__init__(config, metrics)
        self.model_config = model_config
        self.interpreter: Interpreter = None
        self.sub_label_publisher = sub_label_publisher
        self.tensor_input_details: dict[str, Any] = None
        self.tensor_output_details: dict[str, Any] = None
        self.detected_objects: dict[str, float] = {}
        self.labelmap: dict[int, str] = {}
        self.__build_detector()

    def __build_detector(self) -> None:
        self.interpreter = Interpreter(
            model_path=self.model_config.model_path,
            num_threads=2,
        )
        self.interpreter.allocate_tensors()
        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()
        self.labelmap = load_labels(self.model_config.labelmap_path, prefill=0)

    def process_frame(self, obj_data, frame):
        if obj_data["label"] not in self.model_config.object_config.objects:
            return

        x, y, x2, y2 = calculate_region(
            frame.shape,
            obj_data["box"][0],
            obj_data["box"][1],
            obj_data["box"][2],
            obj_data["box"][3],
            224,
            1.0,
        )

        rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2RGB_I420)
        input = rgb[
            y:y2,
            x:x2,
        ]

        if input.shape != (224, 224):
            input = cv2.resize(input, (224, 224))

        input = np.expand_dims(input, axis=0)
        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], input)
        self.interpreter.invoke()
        res: np.ndarray = self.interpreter.get_tensor(
            self.tensor_output_details[0]["index"]
        )[0]
        probs = res / res.sum(axis=0)
        best_id = np.argmax(probs)

        score = round(probs[best_id], 2)

        previous_score = self.detected_objects.get(obj_data["id"], 0.0)

        if score <= previous_score:
            logger.debug(f"Score {score} is worse than previous score {previous_score}")
            return

        self.sub_label_publisher.publish(
            EventMetadataTypeEnum.sub_label,
            (obj_data["id"], self.labelmap[best_id], score),
        )
        self.detected_objects[obj_data["id"]] = score

    def handle_request(self, topic, request_data):
        return None

    def expire_object(self, object_id, camera):
        if object_id in self.detected_objects:
            self.detected_objects.pop(object_id)
