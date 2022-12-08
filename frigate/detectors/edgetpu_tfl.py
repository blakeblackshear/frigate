import logging
import numpy as np

from .detection_api import DetectionApi
import tflite_runtime.interpreter as tflite
from tflite_runtime.interpreter import load_delegate


logger = logging.getLogger(__name__)


class EdgeTpuTfl(DetectionApi):
    def __init__(self, det_device=None, model_config=None, **kwargs):
        device_config = {"device": "usb"}
        if not det_device is None:
            device_config = {"device": det_device}

        edge_tpu_delegate = None

        try:
            logger.info(f"Attempting to load TPU as {device_config['device']}")
            edge_tpu_delegate = load_delegate("libedgetpu.so.1.0", device_config)
            logger.info("TPU found")
            self.interpreter = tflite.Interpreter(
                model_path=model_config.path or "/edgetpu_model.tflite",
                experimental_delegates=[edge_tpu_delegate],
            )
        except ValueError:
            logger.error(
                "No EdgeTPU was detected. If you do not have a Coral device yet, you must configure CPU detectors."
            )
            raise

        self.interpreter.allocate_tensors()

        self.tensor_input_details = self.interpreter.get_input_details()
        self.tensor_output_details = self.interpreter.get_output_details()

    def detect_raw(self, tensor_input):
        self.interpreter.set_tensor(self.tensor_input_details[0]["index"], tensor_input)
        self.interpreter.invoke()

        boxes = self.interpreter.tensor(self.tensor_output_details[0]["index"])()[0]
        class_ids = self.interpreter.tensor(self.tensor_output_details[1]["index"])()[0]
        scores = self.interpreter.tensor(self.tensor_output_details[2]["index"])()[0]
        count = int(
            self.interpreter.tensor(self.tensor_output_details[3]["index"])()[0]
        )

        detections = np.zeros((20, 6), np.float32)

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
