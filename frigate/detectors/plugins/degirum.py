import logging
import queue

import degirum as dg
import numpy as np
from pydantic import Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

logger = logging.getLogger(__name__)
DETECTOR_KEY = "degirum"


### STREAM CLASS FROM DG TOOLS ###
class Stream(queue.Queue):
    """Queue-based iterable class with optional item drop"""

    # minimum queue size to avoid deadlocks:
    # one for stray result, one for poison pill in request_stop(),
    # and one for poison pill gizmo_run()
    min_queue_size = 1

    def __init__(self, maxsize=0, allow_drop: bool = False):
        """Constructor

        - maxsize: maximum stream depth; 0 for unlimited depth
        - allow_drop: allow dropping elements on put() when stream is full
        """

        if maxsize < self.min_queue_size and maxsize != 0:
            raise Exception(
                f"Incorrect stream depth: {maxsize}. Should be 0 (unlimited) or at least {self.min_queue_size}"
            )

        super().__init__(maxsize)
        self.allow_drop = allow_drop
        self.dropped_cnt = 0  # number of dropped items

    _poison = None

    def put(self, item, block: bool = True, timeout=None) -> None:
        """Put an item into the stream

        - item: item to put
        If there is no space left, and allow_drop flag is set, then oldest item will
        be popped to free space
        """
        if self.allow_drop:
            while True:
                try:
                    super().put(item, False)
                    break
                except queue.Full:
                    self.dropped_cnt += 1
                    try:
                        self.get_nowait()
                    finally:
                        pass
        else:
            super().put(item, block, timeout)

    def __iter__(self):
        """Iterator method"""
        return iter(self.get, self._poison)

    def close(self):
        """Close stream: put poison pill"""
        self.put(self._poison)


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
        self._queue = Stream(5, allow_drop=True)
        self._zoo = dg.connect(
            detector_config.location, detector_config.zoo, detector_config.token
        )
        self.dg_model = self._zoo.load_model(
            detector_config.model.path, non_blocking_batch_predict=True
        )
        # Openvino tends to have multidevice, and they default to CPU rather than GPU or NPU
        types = self.dg_model.supported_device_types
        for type in types:
            # If openvino is supported, prioritize using gpu, then npu, then cpu
            if "OPENVINO" in type:
                self.dg_model.device_type = [
                    "OPENVINO/GPU",
                    "OPENVINO/NPU",
                    "OPENVINO/CPU",
                ]
            break
        self.model_height = detector_config.model.height
        self.model_width = detector_config.model.width
        self.predict_batch = self.dg_model.predict_batch(self._queue)

    def detect_raw(self, tensor_input):
        # add tensor_input to input queue
        truncated_input = tensor_input.reshape(tensor_input.shape[1:])
        self._queue.put((truncated_input, ""))

        # define empty detection result
        detections = np.zeros((20, 6), np.float32)
        res = next(self.predict_batch)
        if res is not None:
            # populate detection result with corresponding inference result information
            i = 0
            for result in res.results:
                detections[i] = [
                    result["category_id"],  # Label ID
                    float(result["score"]),  # Confidence
                    result["bbox"][1] / self.model_height,  # y_min
                    result["bbox"][0] / self.model_width,  # x_min
                    result["bbox"][3] / self.model_height,  # y_max
                    result["bbox"][2] / self.model_width,  # x_max
                ]
                i += 1
        return detections
