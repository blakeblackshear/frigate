import logging
import multiprocessing as mp
import os
import queue
import signal
import threading
from frigate.config import DetectorConfig, DetectorTypeEnum
from typing import Dict

import numpy as np

# import tflite_runtime.interpreter as tflite


# from tflite_runtime.interpreter import load_delegate

from frigate.util import EventsPerSecond
from .object_detector import ObjectDetector

logger = logging.getLogger(__name__)


def object_detector_factory(detector_config: DetectorConfig, model_path: str):
    if not (
        detector_config.type == DetectorTypeEnum.cpu
        or detector_config.type == DetectorTypeEnum.edgetpu
    ):
        return None
    object_detector = LocalObjectDetector(
        tf_device=detector_config.device,
        model_path=model_path,
        num_threads=detector_config.num_threads,
    )
    return object_detector


class LocalObjectDetector(ObjectDetector):
    def __init__(self, tf_device=None, model_path=None, num_threads=3):
        self.fps = EventsPerSecond()
        # TODO: process_clip
        # if labels is None:
        #     self.labels = {}
        # else:
        #     self.labels = load_labels(labels)

        device_config = {"device": "usb"}
        if not tf_device is None:
            device_config = {"device": tf_device}

        edge_tpu_delegate = None

        # if tf_device != "cpu":
        #     try:
        #         logger.info(f"Attempting to load TPU as {device_config['device']}")
        #         edge_tpu_delegate = load_delegate("libedgetpu.so.1.0", device_config)
        #         logger.info("TPU found")
        #         self.interpreter = tflite.Interpreter(
        #             model_path=model_path or "/edgetpu_model.tflite",
        #             experimental_delegates=[edge_tpu_delegate],
        #         )
        #     except ValueError:
        #         logger.error(
        #             "No EdgeTPU was detected. If you do not have a Coral device yet, you must configure CPU detectors."
        #         )
        #         raise
        # else:
        #     logger.warning(
        #         "CPU detectors are not recommended and should only be used for testing or for trial purposes."
        #     )
        #     self.interpreter = tflite.Interpreter(
        #         model_path=model_path or "/cpu_model.tflite", num_threads=num_threads
        #     )

        # self.interpreter.allocate_tensors()

        # self.tensor_input_details = self.interpreter.get_input_details()
        # self.tensor_output_details = self.interpreter.get_output_details()

    def detect(self, tensor_input, threshold=0.4):
        # TODO: called from process_clip
        detections = []
        assert False, "implement detect() for process_clip.py"

        # raw_detections = self.detect_raw(tensor_input)

        # for d in raw_detections:
        #     if d[1] < threshold:
        #         break
        #     detections.append(
        #         (self.labels[int(d[0])], float(d[1]), (d[2], d[3], d[4], d[5]))
        #     )
        # self.fps.update()
        return detections

    def detect_raw(self, tensor_input):
        logger.error(">>>>>>>>>> detect raw")

        # Expand dimensions [height, width, 3]  ince the model expects images to have shape [1, height, width, 3]
        tensor_input = np.expand_dims(tensor_input, axis=0)

        # self.interpreter.set_tensor(self.tensor_input_details[0]["index"], tensor_input)
        # self.interpreter.invoke()

        # boxes = self.interpreter.tensor(self.tensor_output_details[0]["index"])()[0]
        # class_ids = self.interpreter.tensor(self.tensor_output_details[1]["index"])()[0]
        # scores = self.interpreter.tensor(self.tensor_output_details[2]["index"])()[0]
        # count = int(
        #     self.interpreter.tensor(self.tensor_output_details[3]["index"])()[0]
        # )

        detections = np.zeros((20, 6), np.float32)

        # for i in range(count):
        #     if scores[i] < 0.4 or i == 20:
        #         break
        #     detections[i] = [
        #         class_ids[i],
        #         float(scores[i]),
        #         boxes[i][0],
        #         boxes[i][1],
        #         boxes[i][2],
        #         boxes[i][3],
        #     ]

        return detections
