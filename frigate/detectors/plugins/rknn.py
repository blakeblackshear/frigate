import logging
import os.path
import urllib.request
from typing import Literal

import cv2
import cv2.dnn
import numpy as np

try:
    from hide_warnings import hide_warnings
except:  # noqa: E722

    def hide_warnings(func):
        pass


from pydantic import Field

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

logger = logging.getLogger(__name__)

DETECTOR_KEY = "rknn"


class RknnDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    yolov8_rknn_model: Literal['n', 's', 'm', 'l', 'x'] = 'n'
    core_mask: int = Field(
        default=0, ge=0, le=7, title="Core mask for NPU."
    )
    min_score: float = Field(
        default=0.5, ge=0, le=1, title="Minimal confidence for detection."
    )
    nms_thresh: float = Field(
        default=0.45, ge=0, le=1, title="IoU threshold for non-maximum suppression."
    )


class Rknn(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, config: RknnDetectorConfig):

        self.model_path = config.model.path or "/models/yolov8n-320x320.rknn"

        if config.model.path != None:
            self.model_path = config.model.path
        else:
            if config.yolov8_rknn_model == 'n':
                self.model_path = "/models/yolov8n-320x320.rknn"
            else:
                # check if user mounted /models/download/
                if not os.path.isdir("/models/download/"):
                    logger.error("Make sure to mount the directory \"/models/download/\" to your system. Otherwise the file will be downloaded at every restart.")
                    raise Exception("Make sure to mount the directory \"/models/download/\" to your system. Otherwise the file will be downloaded at every restart.")


                self.model_path = "/models/download/yolov8{}-320x320.rknn".format(config.yolov8_rknn_model)
                if os.path.isfile(self.model_path) == False:
                    logger.info("Downloading yolov8{} model.".format(config.yolov8_rknn_model))
                    urllib.request.urlretrieve("https://github.com/MarcA711/rknn-models/releases/download/latest/yolov8{}-320x320.rknn".format(config.yolov8_rknn_model), self.model_path)

            if (config.model.width != 320) or (config.model.height != 320):
                logger.error("Make sure to set the model width and heigth to 320 in your config.yml.")
                raise Exception("Make sure to set the model width and heigth to 320 in your config.yml.")

            if config.model.input_pixel_format != 'bgr':
                logger.error("Make sure to set the model input_pixel_format to \"bgr\" in your config.yml.")
                raise Exception("Make sure to set the model input_pixel_format to \"bgr\" in your config.yml.")

            if config.model.input_tensor != 'nhwc':
                logger.error("Make sure to set the model input_tensor to \"nhwc\" in your config.yml.")
                raise Exception("Make sure to set the model input_tensor to \"nhwc\" in your config.yml.")

        self.height = config.model.height
        self.width = config.model.width
        self.core_mask = config.core_mask
        self.min_score = config.min_score
        self.nms_thresh = config.nms_thresh

        from rknnlite.api import RKNNLite

        self.rknn = RKNNLite(verbose=False)
        if self.rknn.load_rknn(self.model_path) != 0:
            logger.error("Error initializing rknn model.")
        if self.rknn.init_runtime(core_mask=self.core_mask) != 0:
            logger.error("Error initializing rknn runtime. Do you run docker in privileged mode?")

    def __del__(self):
        self.rknn.release()

    def postprocess(self, results):
        """
        Processes yolov8 output.

        Args:
        results: array with shape: (1, 84, n, 1) where n depends on yolov8 model size (for 320x320 model n=2100)

        Returns:
        detections: array with shape (20, 6) with 20 rows of (class, confidence, y_min, x_min, y_max, x_max)
        """

        results = np.transpose(results[0, :, :, 0])  # array shape (2100, 84)
        classes = np.argmax(
            results[:, 4:], axis=1
        )  # array shape (2100,); index of class with max confidence of each row
        scores = np.max(
            results[:, 4:], axis=1
        )  # array shape (2100,); max confidence of each row

        # array shape (2100, 4); bounding box of each row
        boxes = np.transpose(
            np.vstack(
                (
                    results[:, 0] - 0.5 * results[:, 2],
                    results[:, 1] - 0.5 * results[:, 3],
                    results[:, 2],
                    results[:, 3],
                )
            )
        )

        # indices of rows with confidence > min_score with Non-maximum Suppression (NMS)
        result_boxes = cv2.dnn.NMSBoxes(
            boxes, scores, self.min_score, self.nms_thresh, 0.5
        )

        detections = np.zeros((20, 6), np.float32)

        for i in range(len(result_boxes)):
            if i >= 20:
                break

            index = result_boxes[i]
            detections[i] = [
                classes[index],
                scores[index],
                (boxes[index][1]) / self.height,
                (boxes[index][0]) / self.width,
                (boxes[index][1] + boxes[index][3]) / self.height,
                (boxes[index][0] + boxes[index][2]) / self.width,
            ]

        return detections

    @hide_warnings
    def inference(self, tensor_input):
        return self.rknn.inference(inputs=tensor_input)

    def detect_raw(self, tensor_input):
        output = self.inference(
            [
                tensor_input,
            ]
        )
        return self.postprocess(output[0])
