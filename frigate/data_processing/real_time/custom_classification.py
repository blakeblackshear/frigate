"""Real time processor that works with classification tflite models."""

import datetime
import logging
import os
import threading
from typing import Any

import cv2
import numpy as np

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum
from frigate.comms.event_metadata_updater import (
    EventMetadataPublisher,
    EventMetadataTypeEnum,
)
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.config.classification import CustomClassificationConfig
from frigate.const import CLIPS_DIR, MODEL_CACHE_DIR, UPDATE_MODEL_STATE
from frigate.types import ModelStatusTypesEnum
from frigate.util.builtin import load_labels
from frigate.util.classification import train_classification_model
from frigate.util.object import box_overlaps, calculate_region

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
        requestor: InterProcessRequestor,
        metrics: DataProcessorMetrics,
    ):
        super().__init__(config, metrics)
        self.model_config = model_config
        self.requestor = requestor
        self.model_dir = os.path.join(MODEL_CACHE_DIR, self.model_config.name)
        self.train_dir = os.path.join(CLIPS_DIR, self.model_config.name, "train")
        self.interpreter: Interpreter = None
        self.tensor_input_details: dict[str, Any] = None
        self.tensor_output_details: dict[str, Any] = None
        self.labelmap: dict[int, str] = {}
        self.last_run = datetime.datetime.now().timestamp()
        self.__build_detector()

    def __build_detector(self) -> None:
        self.interpreter = Interpreter(
            model_path=os.path.join(self.model_dir, "model.tflite"),
            num_threads=2,
        )
        self.interpreter.allocate_tensors()
        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()
        self.labelmap = load_labels(
            os.path.join(self.model_dir, "labelmap.txt"),
            prefill=0,
        )

    def __retrain_model(self) -> None:
        train_classification_model(self.model_config.name)
        self.__build_detector()
        self.requestor.send_data(
            UPDATE_MODEL_STATE,
            {
                "model": self.model_config.name,
                "state": ModelStatusTypesEnum.complete,
            },
        )
        logger.info(f"Successfully loaded updated model for {self.model_config.name}")

    def process_frame(self, frame_data: dict[str, Any], frame: np.ndarray):
        camera = frame_data.get("camera")

        if camera not in self.model_config.state_config.cameras:
            return

        camera_config = self.model_config.state_config.cameras[camera]
        crop = [
            camera_config.crop[0],
            camera_config.crop[1],
            camera_config.crop[2],
            camera_config.crop[3],
        ]
        should_run = False

        now = datetime.datetime.now().timestamp()
        if (
            self.model_config.state_config.interval
            and now > self.last_run + self.model_config.state_config.interval
        ):
            self.last_run = now
            should_run = True

        if (
            not should_run
            and self.model_config.state_config.motion
            and any([box_overlaps(crop, mb) for mb in frame_data.get("motion", [])])
        ):
            # classification should run at most once per second
            if now > self.last_run + 1:
                self.last_run = now
                should_run = True

        if not should_run:
            return

        x, y, x2, y2 = calculate_region(
            frame.shape,
            crop[0],
            crop[1],
            crop[2],
            crop[3],
            224,
            1.0,
        )

        rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2RGB_I420)
        frame = rgb[
            y:y2,
            x:x2,
        ]

        if frame.shape != (224, 224):
            frame = cv2.resize(frame, (224, 224))

        input = np.expand_dims(frame, axis=0)
        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], input)
        self.interpreter.invoke()
        res: np.ndarray = self.interpreter.get_tensor(
            self.tensor_output_details[0]["index"]
        )[0]
        probs = res / res.sum(axis=0)
        best_id = np.argmax(probs)
        score = round(probs[best_id], 2)

        write_classification_attempt(
            self.train_dir,
            cv2.cvtColor(frame, cv2.COLOR_RGB2BGR),
            now,
            self.labelmap[best_id],
            score,
        )

        if score >= camera_config.threshold:
            self.requestor.send_data(
                f"{camera}/classification/{self.model_config.name}",
                self.labelmap[best_id],
            )

    def handle_request(self, topic, request_data):
        if topic == EmbeddingsRequestEnum.train_classification.value:
            if request_data.get("model_name") == self.model_config.name:
                self.requestor.send_data(
                    UPDATE_MODEL_STATE,
                    {
                        "model": self.model_config.name,
                        "state": ModelStatusTypesEnum.training,
                    },
                )
                threading.Thread(target=self.__retrain_model).start()
                return {
                    "success": True,
                    "message": f"Began training {self.model_config.name} model.",
                }
            else:
                return None
        else:
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
        self.model_dir = os.path.join(MODEL_CACHE_DIR, self.model_config.name)
        self.train_dir = os.path.join(self.model_dir, "train")
        self.interpreter: Interpreter = None
        self.sub_label_publisher = sub_label_publisher
        self.tensor_input_details: dict[str, Any] = None
        self.tensor_output_details: dict[str, Any] = None
        self.detected_objects: dict[str, float] = {}
        self.labelmap: dict[int, str] = {}
        self.__build_detector()

    def __build_detector(self) -> None:
        self.interpreter = Interpreter(
            model_path=os.path.join(self.model_dir, "model.tflite"),
            num_threads=2,
        )
        self.interpreter.allocate_tensors()
        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()
        self.labelmap = load_labels(
            os.path.join(self.model_dir, "labelmap.txt"),
            prefill=0,
        )

    def __retrain_model(self) -> None:
        train_classification_model(self.model_config.name)
        self.__build_detector()
        self.requestor.send_data(
            UPDATE_MODEL_STATE,
            {
                "model": self.model_config.name,
                "state": ModelStatusTypesEnum.complete,
            },
        )
        logger.info(f"Successfully loaded updated model for {self.model_config.name}")

    def process_frame(self, obj_data, frame):
        if obj_data["label"] not in self.model_config.object_config.objects:
            return

        now = datetime.datetime.now().timestamp()
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

        write_classification_attempt(
            self.train_dir,
            cv2.cvtColor(frame, cv2.COLOR_RGB2BGR),
            now,
            self.labelmap[best_id],
            score,
        )

        if score <= previous_score:
            logger.debug(f"Score {score} is worse than previous score {previous_score}")
            return

        self.sub_label_publisher.publish(
            EventMetadataTypeEnum.sub_label,
            (obj_data["id"], self.labelmap[best_id], score),
        )
        self.detected_objects[obj_data["id"]] = score

    def handle_request(self, topic, request_data):
        if topic == EmbeddingsRequestEnum.train_classification.value:
            if request_data.get("model_name") == self.model_config.name:
                self.requestor.send_data(
                    UPDATE_MODEL_STATE,
                    {
                        "model": self.model_config.name,
                        "state": ModelStatusTypesEnum.training,
                    },
                )
                threading.Thread(target=self.__retrain_model).start()
                return {
                    "success": True,
                    "message": f"Began training {self.model_config.name} model.",
                }
            else:
                return None
        else:
            return None

    def expire_object(self, object_id, camera):
        if object_id in self.detected_objects:
            self.detected_objects.pop(object_id)


@staticmethod
def write_classification_attempt(
    folder: str,
    frame: np.ndarray,
    timestamp: float,
    label: str,
    score: float,
) -> None:
    if "-" in label:
        label = label.replace("-", "_")

    file = os.path.join(folder, f"{timestamp}-{label}-{score}.webp")
    os.makedirs(folder, exist_ok=True)
    cv2.imwrite(file, frame)

    files = sorted(
        filter(lambda f: (f.endswith(".webp")), os.listdir(folder)),
        key=lambda f: os.path.getctime(os.path.join(folder, f)),
        reverse=True,
    )

    # delete oldest face image if maximum is reached
    if len(files) > 100:
        os.unlink(os.path.join(folder, files[-1]))
