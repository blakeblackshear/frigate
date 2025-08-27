import logging
import queue

import numpy as np
from pydantic import Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

logger = logging.getLogger(__name__)
DETECTOR_KEY = "degirum"


### DETECTOR CONFIG ###
class DGDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    location: str = Field(default=None, title="Inference Location")
    zoo: str = Field(default=None, title="Model Zoo")
    token: str = Field(default=None, title="DeGirum Cloud Token")


### ACTUAL DETECTOR  ###
class DGDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: DGDetectorConfig):
        try:
            import degirum as dg
        except ModuleNotFoundError:
            raise ImportError("Unable to import DeGirum detector.")

        self._queue = queue.Queue()
        self._zoo = dg.connect(
            detector_config.location, detector_config.zoo, detector_config.token
        )

        logger.debug(f"Models in zoo: {self._zoo.list_models()}")

        self.dg_model = self._zoo.load_model(
            detector_config.model.path,
        )

        # Setting input image format to raw reduces preprocessing time
        self.dg_model.input_image_format = "RAW"

        # Prioritize the most powerful hardware available
        self.select_best_device_type()
        # Frigate handles pre processing as long as these are all set
        input_shape = self.dg_model.input_shape[0]
        self.model_height = input_shape[1]
        self.model_width = input_shape[2]

        # Passing in dummy frame so initial connection latency happens in
        # init function and not during actual prediction
        frame = np.zeros(
            (detector_config.model.width, detector_config.model.height, 3),
            dtype=np.uint8,
        )
        # Pass in frame to overcome first frame latency
        self.dg_model(frame)
        self.prediction = self.prediction_generator()

    def select_best_device_type(self):
        """
        Helper function that selects fastest hardware available per model runtime
        """
        types = self.dg_model.supported_device_types

        device_map = {
            "OPENVINO": ["GPU", "NPU", "CPU"],
            "HAILORT": ["HAILO8L", "HAILO8"],
            "N2X": ["ORCA1", "CPU"],
            "ONNX": ["VITIS_NPU", "CPU"],
            "RKNN": ["RK3566", "RK3568", "RK3588"],
            "TENSORRT": ["DLA", "GPU", "DLA_ONLY"],
            "TFLITE": ["ARMNN", "EDGETPU", "CPU"],
        }

        runtime = types[0].split("/")[0]
        # Just create an array of format {runtime}/{hardware} for every hardware
        # in the value for appropriate key in device_map
        self.dg_model.device_type = [
            f"{runtime}/{hardware}" for hardware in device_map[runtime]
        ]

    def prediction_generator(self):
        """
        Generator for all incoming frames. By using this generator, we don't have to keep
        reconnecting our websocket on every "predict" call.
        """
        logger.debug("Prediction generator was called")
        with self.dg_model as model:
            while 1:
                logger.info(f"q size before calling get: {self._queue.qsize()}")
                data = self._queue.get(block=True)
                logger.info(f"q size after calling get: {self._queue.qsize()}")
                logger.debug(
                    f"Data we're passing into model predict: {data}, shape of data: {data.shape}"
                )
                result = model.predict(data)
                logger.debug(f"Prediction result: {result}")
                yield result

    def detect_raw(self, tensor_input):
        # Reshaping tensor to work with pysdk
        truncated_input = tensor_input.reshape(tensor_input.shape[1:])
        logger.debug(f"Detect raw was called for tensor input: {tensor_input}")

        # add tensor_input to input queue
        self._queue.put(truncated_input)
        logger.debug(f"Queue size after adding truncated input: {self._queue.qsize()}")

        # define empty detection result
        detections = np.zeros((20, 6), np.float32)
        # grab prediction
        res = next(self.prediction)

        # If we have an empty prediction, return immediately
        if len(res.results) == 0 or len(res.results[0]) == 0:
            return detections

        i = 0
        for result in res.results:
            if i >= 20:
                break

            detections[i] = [
                result["category_id"],
                float(result["score"]),
                result["bbox"][1] / self.model_height,
                result["bbox"][0] / self.model_width,
                result["bbox"][3] / self.model_height,
                result["bbox"][2] / self.model_width,
            ]
            i += 1

        logger.debug(f"Detections output: {detections}")
        return detections
