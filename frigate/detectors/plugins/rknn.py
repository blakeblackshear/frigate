import logging
import os.path
from typing import Literal

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


class RknnDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    core_mask: int = Field(default=0, ge=0, le=7, title="Core mask for NPU.")


class Rknn(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, config: RknnDetectorConfig):
        # create symlink for Home Assistant add on
        if not os.path.isfile("/proc/device-tree/compatible"):
            if os.path.isfile("/device-tree/compatible"):
                os.symlink("/device-tree/compatible", "/proc/device-tree/compatible")

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

        if not os.path.isfile("/usr/lib/librknnrt.so"):
            if "rk356" in soc:
                os.rename("/usr/lib/librknnrt_rk356x.so", "/usr/lib/librknnrt.so")
            elif "rk3588" in soc:
                os.rename("/usr/lib/librknnrt_rk3588.so", "/usr/lib/librknnrt.so")

        self.core_mask = config.core_mask
        self.height = config.model.height
        self.width = config.model.width

        if True:
            os.makedirs("/config/model_cache/rknn", exist_ok=True)

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

        raise Exception(
            "RKNN does not currently support any models. Please see the docs for more info."
        )

    def __del__(self):
        self.rknn.release()

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
