import logging
import os.path
import urllib.request
from typing import Literal

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

supported_socs = ["rk3562", "rk3566", "rk3568", "rk3588"]

yolov8_suffix = {
    "default-yolov8n": "n",
    "default-yolov8s": "s",
    "default-yolov8m": "m",
    "default-yolov8l": "l",
    "default-yolov8x": "x",
}


class RknnDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    core_mask: int = Field(default=0, ge=0, le=7, title="Core mask for NPU.")


class Rknn(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, config: RknnDetectorConfig):
        # find out SoC
        try:
            with open("/proc/device-tree/compatible") as file:
                soc = file.read().split(",")[-1].strip("\x00")
        except FileNotFoundError:
            logger.error("Make sure to run docker in privileged mode.")
            raise Exception("Make sure to run docker in privileged mode.")

        if soc not in supported_socs:
            logger.error(
                "Your SoC is not supported. Your SoC is: {}. Currently these SoCs are supported: {}.".format(
                    soc, supported_socs
                )
            )
            raise Exception(
                "Your SoC is not supported. Your SoC is: {}. Currently these SoCs are supported: {}.".format(
                    soc, supported_socs
                )
            )

        if "rk356" in soc:
            os.rename("/usr/lib/librknnrt_rk356x.so", "/usr/lib/librknnrt.so")
        elif "rk3588" in soc:
            os.rename("/usr/lib/librknnrt_rk3588.so", "/usr/lib/librknnrt.so")

        self.model_path = config.model.path or "default-yolov8n"
        self.core_mask = config.core_mask
        self.height = config.model.height
        self.width = config.model.width

        if self.model_path in yolov8_suffix:
            if self.model_path == "default-yolov8n":
                self.model_path = "/models/rknn/yolov8n-320x320-{soc}.rknn".format(
                    soc=soc
                )
            else:
                model_suffix = yolov8_suffix[self.model_path]
                self.model_path = (
                    "/config/model_cache/rknn/yolov8{suffix}-320x320-{soc}.rknn".format(
                        suffix=model_suffix, soc=soc
                    )
                )

                os.makedirs("/config/model_cache/rknn", exist_ok=True)
                if not os.path.isfile(self.model_path):
                    logger.info(
                        "Downloading yolov8{suffix} model.".format(suffix=model_suffix)
                    )
                    urllib.request.urlretrieve(
                        "https://github.com/MarcA711/rknn-models/releases/download/v1.5.2-{soc}/yolov8{suffix}-320x320-{soc}.rknn".format(
                            soc=soc, suffix=model_suffix
                        ),
                        self.model_path,
                    )

            if (config.model.width != 320) or (config.model.height != 320):
                logger.error(
                    "Make sure to set the model width and heigth to 320 in your config.yml."
                )
                raise Exception(
                    "Make sure to set the model width and heigth to 320 in your config.yml."
                )

            if config.model.input_pixel_format != "bgr":
                logger.error(
                    'Make sure to set the model input_pixel_format to "bgr" in your config.yml.'
                )
                raise Exception(
                    'Make sure to set the model input_pixel_format to "bgr" in your config.yml.'
                )

            if config.model.input_tensor != "nhwc":
                logger.error(
                    'Make sure to set the model input_tensor to "nhwc" in your config.yml.'
                )
                raise Exception(
                    'Make sure to set the model input_tensor to "nhwc" in your config.yml.'
                )

        from rknnlite.api import RKNNLite

        self.rknn = RKNNLite(verbose=False)
        if self.rknn.load_rknn(self.model_path) != 0:
            logger.error("Error initializing rknn model.")
        if self.rknn.init_runtime(core_mask=self.core_mask) != 0:
            logger.error(
                "Error initializing rknn runtime. Do you run docker in privileged mode?"
            )

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
        scores = np.max(
            results[:, 4:], axis=1
        )  # array shape (2100,); max confidence of each row

        # remove lines with score scores < 0.4
        filtered_arg = np.argwhere(scores > 0.4)
        results = results[filtered_arg[:, 0]]
        scores = scores[filtered_arg[:, 0]]

        num_detections = len(scores)

        if num_detections == 0:
            return np.zeros((20, 6), np.float32)

        if num_detections > 20:
            top_arg = np.argpartition(scores, -20)[-20:]
            results = results[top_arg]
            scores = scores[top_arg]
            num_detections = 20

        classes = np.argmax(results[:, 4:], axis=1)

        boxes = np.transpose(
            np.vstack(
                (
                    (results[:, 1] - 0.5 * results[:, 3]) / self.height,
                    (results[:, 0] - 0.5 * results[:, 2]) / self.width,
                    (results[:, 1] + 0.5 * results[:, 3]) / self.height,
                    (results[:, 0] + 0.5 * results[:, 2]) / self.width,
                )
            )
        )

        detections = np.zeros((20, 6), np.float32)
        detections[:num_detections, 0] = classes
        detections[:num_detections, 1] = scores
        detections[:num_detections, 2:] = boxes

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
