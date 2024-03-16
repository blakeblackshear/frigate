import logging
import os.path
import urllib.request
import numpy as np
from typing import Literal
from pydantic import Field

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

logger = logging.getLogger(__name__)

DETECTOR_KEY = "rknn"

supported_socs = ["rk3562", "rk3566", "rk3568", "rk3588"]


class RknnDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    core_mask: int = Field(default=0, ge=0, le=7, title="Core mask for NPU.")


class Rknn(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, config: RknnDetectorConfig):
        self.height = config.model.height
        self.width = config.model.width

        soc = self.get_soc()
        core_mask = config.core_mask

        model_properties = self.get_model_properties(
            config.model.path or "default-yolov8n", soc
        )

        if model_properties["supplied"] and not os.path.isfile(
            model_properties["path"]
        ):
            self.download_model(model_properties["filename"])

        from rknnlite.api import RKNNLite

        self.rknn = RKNNLite(verbose=False)
        if self.rknn.load_rknn(model_properties["path"]) != 0:
            logger.error("Error initializing rknn model.")
        if self.rknn.init_runtime(core_mask=core_mask) != 0:
            logger.error(
                "Error initializing rknn runtime. Do you run docker in privileged mode?"
            )

    def __del__(self):
        self.rknn.release()

    def get_soc(self):
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

        return soc

    def get_model_properties(self, path, soc):
        model_properties = {
            "supplied": False,
            "path": path,
            "suffix": None,
            "quant": None,
            "filename": None,
        }

        if path[:-1] in ["default-yolov8", "quant_i8"] and path[-1] in "nsmlx":
            model_properties["supplied"] = True
            model_properties["suffix"] = path[-1]
            model_properties["quant"] = path[7:9] if path.startswith("quant") else None

            prefix = "/config/model_cache/rknn/"
            if model_properties["suffix"] == "n" and model_properties["quant"] == None:
                prefix = "/models/rknn/"

            model_properties["filename"] = "{}-{}.rknn".format(path, soc)
            model_properties["path"] = prefix + model_properties["filename"]

        return model_properties

    def download_model(self, name):
        os.makedirs("/config/model_cache/rknn", exist_ok=True)
        logger.info("Downloading yolov8 model.")
        urllib.request.urlretrieve(
            "https://github.com/MarcA711/rknn-models/releases/download/v1.6.0-yolov8-default/"
            + name,
            "/config/model_cache/rknn/" + name,
        )

    def check_config(self, config):
        if (config.model.width != 320) or (config.model.height != 320):
            logger.error(
                "Make sure to set the model width and height to 320 in your config.yml."
            )
            raise Exception(
                "Make sure to set the model width and height to 320 in your config.yml."
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

    def postprocess(self, results):
        """
        Processes yolov8 output.

        Args:
        results: array with shape: (1, 84, n, 1) where n depends on yolov8 model size (for 320x320 model n=2100)

        Returns:
        detections: array with shape (20, 6) with 20 rows of (class, confidence, y_min, x_min, y_max, x_max)
        """

        results = np.transpose(results[0, 0, :, :])  # array shape (2100, 84)
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

    def detect_raw(self, tensor_input):
        output = self.rknn.inference(
            [
                tensor_input,
            ]
        )
        return self.postprocess(np.array(output))
