import logging
import os.path
import re
import urllib.request
from typing import Literal

from pydantic import Field

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum

logger = logging.getLogger(__name__)

DETECTOR_KEY = "rknn"

supported_socs = ["rk3562", "rk3566", "rk3568", "rk3576", "rk3588"]

supported_models = {ModelTypeEnum.yolonas: "^deci-fp16-yolonas_[sml]$"}

model_cache_dir = "/config/model_cache/rknn_cache/"


class RknnDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    num_cores: int = Field(default=0, ge=0, le=3, title="Number of NPU cores to use.")


class Rknn(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, config: RknnDetectorConfig):
        super().__init__(config)
        self.height = config.model.height
        self.width = config.model.width
        core_mask = 2**config.num_cores - 1
        soc = self.get_soc()

        model_path = config.model.path or "deci-fp16-yolonas_s"

        model_props = self.parse_model_input(model_path, soc)

        if model_props["preset"]:
            config.model.model_type = model_props["model_type"]

            if model_props["model_type"] == ModelTypeEnum.yolonas:
                logger.info(
                    "You are using yolo-nas with weights from DeciAI. "
                    "These weights are subject to their license and can't be used commercially. "
                    "For more information, see: https://docs.deci.ai/super-gradients/latest/LICENSE.YOLONAS.html"
                )

        from rknnlite.api import RKNNLite

        self.rknn = RKNNLite(verbose=False)
        if self.rknn.load_rknn(model_props["path"]) != 0:
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
            raise Exception("Make sure to run docker in privileged mode.")

        if soc not in supported_socs:
            raise Exception(
                f"Your SoC is not supported. Your SoC is: {soc}. Currently these SoCs are supported: {supported_socs}."
            )

        return soc

    def parse_model_input(self, model_path, soc):
        model_props = {}

        # find out if user provides his own model
        # user provided models should be a path and contain a "/"
        if "/" in model_path:
            model_props["preset"] = False
            model_props["path"] = model_path
        else:
            model_props["preset"] = True

            """
            Filenames follow this pattern:
            origin-quant-basename-soc-tk_version-rev.rknn
            origin: From where comes the model? default: upstream repo; rknn: modifications from airockchip
            quant: i8 or fp16
            basename: e.g. yolonas_s
            soc: e.g. rk3588
            tk_version: e.g. v2.0.0
            rev: e.g. 1

            Full name could be: default-fp16-yolonas_s-rk3588-v2.0.0-1.rknn
            """

            model_matched = False

            for model_type, pattern in supported_models.items():
                if re.match(pattern, model_path):
                    model_matched = True
                    model_props["model_type"] = model_type

            if model_matched:
                model_props["filename"] = model_path + f"-{soc}-v2.0.0-1.rknn"

                model_props["path"] = model_cache_dir + model_props["filename"]

                if not os.path.isfile(model_props["path"]):
                    self.download_model(model_props["filename"])
            else:
                supported_models_str = ", ".join(
                    model[1:-1] for model in supported_models
                )
                raise Exception(
                    f"Model {model_path} is unsupported. Provide your own model or choose one of the following: {supported_models_str}"
                )

        return model_props

    def download_model(self, filename):
        if not os.path.isdir(model_cache_dir):
            os.mkdir(model_cache_dir)

        urllib.request.urlretrieve(
            f"https://github.com/MarcA711/rknn-models/releases/download/v2.0.0/{filename}",
            model_cache_dir + filename,
        )

    def check_config(self, config):
        if (config.model.width != 320) or (config.model.height != 320):
            raise Exception(
                "Make sure to set the model width and height to 320 in your config."
            )

        if config.model.input_pixel_format != "bgr":
            raise Exception(
                'Make sure to set the model input_pixel_format to "bgr" in your config.'
            )

        if config.model.input_tensor != "nhwc":
            raise Exception(
                'Make sure to set the model input_tensor to "nhwc" in your config.'
            )

    def detect_raw(self, tensor_input):
        output = self.rknn.inference(
            [
                tensor_input,
            ]
        )
        return self.post_process(output)
