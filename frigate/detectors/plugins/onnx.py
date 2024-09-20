import logging
import os

import numpy as np
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import (
    BaseDetectorConfig,
    ModelTypeEnum,
)

logger = logging.getLogger(__name__)

DETECTOR_KEY = "onnx"


class ONNXDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]


class ONNXDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: ONNXDetectorConfig):
        try:
            import onnxruntime as ort

            logger.info("ONNX: loaded onnxruntime module")
        except ModuleNotFoundError:
            logger.error(
                "ONNX: module loading failed, need 'pip install onnxruntime'?!?"
            )
            raise

        path = detector_config.model.path
        logger.info(f"ONNX: loading {detector_config.model.path}")

        providers = ort.get_available_providers()
        options = []

        for provider in providers:
            if provider == "TensorrtExecutionProvider":
                os.makedirs(
                    "/config/model_cache/tensorrt/ort/trt-engines", exist_ok=True
                )
                options.append(
                    {
                        "trt_timing_cache_enable": True,
                        "trt_timing_cache_path": "/config/model_cache/tensorrt/ort",
                        "trt_engine_cache_enable": True,
                        "trt_dump_ep_context_model": True,
                        "trt_engine_cache_path": "/config/model_cache/tensorrt/ort/trt-engines",
                        "trt_ep_context_file_path": "/config/model_cache/tensorrt/ort",
                    }
                )
            elif provider == "OpenVINOExecutionProvider":
                os.makedirs("/config/model_cache/openvino/ort", exist_ok=True)
                options.append(
                    {
                        "cache_dir": "/config/model_cache/openvino/ort",
                        "device_type": "GPU",
                    }
                )
            else:
                options.append({})

        self.model = ort.InferenceSession(
            path, providers=providers, provider_options=options
        )

        self.h = detector_config.model.height
        self.w = detector_config.model.width
        self.onnx_model_type = detector_config.model.model_type
        self.onnx_model_px = detector_config.model.input_pixel_format
        self.onnx_model_shape = detector_config.model.input_tensor
        path = detector_config.model.path

        logger.info(f"ONNX: {path} loaded")

    def detect_raw(self, tensor_input):
        model_input_name = self.model.get_inputs()[0].name
        tensor_output = self.model.run(None, {model_input_name: tensor_input})

        if self.onnx_model_type == ModelTypeEnum.yolonas:
            predictions = tensor_output[0]

            detections = np.zeros((20, 6), np.float32)

            for i, prediction in enumerate(predictions):
                if i == 20:
                    break
                (_, x_min, y_min, x_max, y_max, confidence, class_id) = prediction
                # when running in GPU mode, empty predictions in the output have class_id of -1
                if class_id < 0:
                    break
                detections[i] = [
                    class_id,
                    confidence,
                    y_min / self.h,
                    x_min / self.w,
                    y_max / self.h,
                    x_max / self.w,
                ]
            return detections
        else:
            raise Exception(
                f"{self.onnx_model_type} is currently not supported for rocm. See the docs for more info on supported models."
            )
