import logging

import numpy as np
from pydantic import Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.object_detection import load_labels

try:
    from tflite_runtime.interpreter import Interpreter
except ModuleNotFoundError:
    from tensorflow.lite.python.interpreter import Interpreter


logger = logging.getLogger(__name__)

DETECTOR_KEY = "audio"


class AudioTfl(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, labels):
        self.labels = load_labels("/audio-labelmap.txt")
        self.interpreter = Interpreter(
            model_path="/cpu_audio_model.tflite",
            num_threads=2,
        )

        self.interpreter.allocate_tensors()

        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()

    def _detect_raw(self, tensor_input):
        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], tensor_input)
        self.interpreter.invoke()
        detections = np.zeros((20, 6), np.float32)

        res = self.interpreter.get_tensor(self.tensor_output_details[0]["index"])[0]
        non_zero_indices = res > 0
        class_ids = np.argpartition(-res, 20)[:20]
        class_ids = class_ids[np.argsort(-res[class_ids])]
        class_ids = class_ids[non_zero_indices[class_ids]]
        scores = res[class_ids]
        boxes = np.full((scores.shape[0], 4), -1, np.float32)
        count = len(scores)

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

    def detect(self, tensor_input, threshold=0.8):
        detections = []

        raw_detections = self._detect_raw(tensor_input)

        for d in raw_detections:
            if d[1] < threshold:
                break
            detections.append(
                (self.labels[int(d[0])], float(d[1]), (d[2], d[3], d[4], d[5]))
            )
        return detections
