import ctypes
import logging
import os
import subprocess
import sys

import cv2
import numpy as np
from pydantic import Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum

logger = logging.getLogger(__name__)

DETECTOR_KEY = "rocm"


def detect_gfx_version():
    return subprocess.getoutput(
        "unset HSA_OVERRIDE_GFX_VERSION && /opt/rocm/bin/rocminfo | grep gfx |head -1|awk '{print $2}'"
    )


def auto_override_gfx_version():
    # If environment variable already in place, do not override
    gfx_version = detect_gfx_version()
    old_override = os.getenv("HSA_OVERRIDE_GFX_VERSION")
    if old_override not in (None, ""):
        logger.warning(
            f"AMD/ROCm: detected {gfx_version} but HSA_OVERRIDE_GFX_VERSION already present ({old_override}), not overriding!"
        )
        return old_override
    mapping = {
        "gfx90c": "9.0.0",
        "gfx1031": "10.3.0",
        "gfx1103": "11.0.0",
    }
    override = mapping.get(gfx_version)
    if override is not None:
        logger.warning(
            f"AMD/ROCm: detected {gfx_version}, overriding HSA_OVERRIDE_GFX_VERSION={override}"
        )
        os.putenv("HSA_OVERRIDE_GFX_VERSION", override)
        return override
    return ""


class ROCmDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    conserve_cpu: bool = Field(
        default=True,
        title="Conserve CPU at the expense of latency (and reduced max throughput)",
    )
    auto_override_gfx: bool = Field(
        default=True, title="Automatically detect and override gfx version"
    )


class ROCmDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: ROCmDetectorConfig):
        if detector_config.auto_override_gfx:
            auto_override_gfx_version()

        try:
            sys.path.append("/opt/rocm/lib")
            import migraphx

            logger.info("AMD/ROCm: loaded migraphx module")
        except ModuleNotFoundError:
            logger.error("AMD/ROCm: module loading failed, missing ROCm environment?")
            raise

        if detector_config.conserve_cpu:
            logger.info("AMD/ROCm: switching HIP to blocking mode to conserve CPU")
            ctypes.CDLL("/opt/rocm/lib/libamdhip64.so").hipSetDeviceFlags(4)

        self.rocm_model_type = detector_config.model.model_type
        path = detector_config.model.path
        mxr_path = os.path.splitext(path)[0] + ".mxr"

        if path.endswith(".mxr"):
            logger.info(f"AMD/ROCm: loading parsed model from {mxr_path}")
            self.model = migraphx.load(mxr_path)
        elif os.path.exists(mxr_path):
            logger.info(f"AMD/ROCm: loading parsed model from {mxr_path}")
            self.model = migraphx.load(mxr_path)
        else:
            logger.info(f"AMD/ROCm: loading model from {path}")

            if path.endswith(".onnx"):
                self.model = migraphx.parse_onnx(path)
            elif (
                path.endswith(".tf")
                or path.endswith(".tf2")
                or path.endswith(".tflite")
            ):
                # untested
                self.model = migraphx.parse_tf(path)
            else:
                raise Exception(f"AMD/ROCm: unknown model format {path}")

            logger.info("AMD/ROCm: compiling the model")

            self.model.compile(
                migraphx.get_target("gpu"), offload_copy=True, fast_math=True
            )

            logger.info(f"AMD/ROCm: saving parsed model into {mxr_path}")

            os.makedirs("/config/model_cache/rocm", exist_ok=True)
            migraphx.save(self.model, mxr_path)

        logger.info("AMD/ROCm: model loaded")

    def detect_raw(self, tensor_input):
        model_input_name = self.model.get_parameter_names()[0]
        model_input_shape = tuple(
            self.model.get_parameter_shapes()[model_input_name].lens()
        )
        logger.info(f"the model input shape is {model_input_shape}")

        tensor_input = cv2.dnn.blobFromImage(
            tensor_input[0],
            1.0 / 255,
            model_input_shape,
            None,
            swapRB=False,
        )

        detector_result = self.model.run({model_input_name: tensor_input})[0]
        addr = ctypes.cast(detector_result.data_ptr(), ctypes.POINTER(ctypes.c_float))

        # ruff: noqa: F841
        tensor_output = np.ctypeslib.as_array(
            addr, shape=detector_result.get_shape().lens()
        )

        if self.rocm_model_type == ModelTypeEnum.yolonas:
            logger.info(f"ROCM output has {tensor_output.shape[2]} boxes")
            return np.zeros((20, 6), np.float32)
        else:
            raise Exception(
                f"{self.rocm_model_type} is currently not supported for rocm. See the docs for more info on supported models."
            )
