import logging

import numpy as np
from pydantic import ConfigDict, Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detection_runners import get_optimized_runner
from frigate.detectors.detector_config import (
    BaseDetectorConfig,
    InputDTypeEnum,
    InputTensorEnum,
    ModelTypeEnum,
)
from frigate.util.model import (
    post_process_dfine,
    post_process_rfdetr,
    post_process_yolo,
    post_process_yolox,
)

logger = logging.getLogger(__name__)

DETECTOR_KEY = "onnx"


class ONNXDetectorConfig(BaseDetectorConfig):
    """ONNX detector for running ONNX models; will use available acceleration backends (CUDA/ROCm/OpenVINO) when available."""

    model_config = ConfigDict(
        title="ONNX",
    )

    type: Literal[DETECTOR_KEY]
    device: str = Field(
        default="AUTO",
        title="Device Type",
        description="The device to use for ONNX inference (e.g. 'AUTO', 'CPU', 'GPU').",
    )


class ONNXDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: ONNXDetectorConfig):
        super().__init__(detector_config)

        path = detector_config.model.path
        logger.info(f"ONNX: loading {detector_config.model.path}")

        self.runner = get_optimized_runner(
            path,
            detector_config.device,
            model_type=detector_config.model.model_type,
        )

        self.onnx_model_type = detector_config.model.model_type
        self.onnx_model_px = detector_config.model.input_pixel_format
        self.onnx_model_shape = detector_config.model.input_tensor

        if self.onnx_model_type == ModelTypeEnum.yolox:
            self.calculate_grids_strides()

        self._warmup(detector_config)
        logger.info(f"ONNX: {path} loaded")

    def _warmup(self, detector_config: ONNXDetectorConfig) -> None:
        """Run a warmup inference to front-load one-time compilation costs.

        Some GPU backends have a slow first inference: CUDA may need PTX JIT
        compilation on newer architectures (e.g. NVIDIA 50-series / Blackwell),
        and MIGraphX compiles the model graph on first run. Running it here
        (during detector creation) keeps the watchdog start_time at 0.0 so the
        process won't be killed.
        """
        if detector_config.model.input_tensor == InputTensorEnum.nchw:
            shape = (1, 3, detector_config.model.height, detector_config.model.width)
        else:
            shape = (1, detector_config.model.height, detector_config.model.width, 3)

        if detector_config.model.input_dtype in (
            InputDTypeEnum.float,
            InputDTypeEnum.float_denorm,
        ):
            dtype = np.float32
        else:
            dtype = np.uint8

        logger.info("ONNX: warming up detector (may take a while on first run)...")
        self.detect_raw(np.zeros(shape, dtype=dtype))

    def detect_raw(self, tensor_input: np.ndarray):
        if self.onnx_model_type == ModelTypeEnum.dfine:
            tensor_output = self.runner.run(
                {
                    "images": tensor_input,
                    "orig_target_sizes": np.array(
                        [[self.height, self.width]], dtype=np.int64
                    ),
                }
            )
            return post_process_dfine(tensor_output, self.width, self.height)

        model_input_name = self.runner.get_input_names()[0]
        tensor_output = self.runner.run({model_input_name: tensor_input})

        if self.onnx_model_type == ModelTypeEnum.rfdetr:
            return post_process_rfdetr(tensor_output)
        elif self.onnx_model_type == ModelTypeEnum.yolonas:
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
                    y_min / self.height,
                    x_min / self.width,
                    y_max / self.height,
                    x_max / self.width,
                ]
            return detections
        elif self.onnx_model_type == ModelTypeEnum.yologeneric:
            return post_process_yolo(tensor_output, self.width, self.height)
        elif self.onnx_model_type == ModelTypeEnum.yolox:
            return post_process_yolox(
                tensor_output[0],
                self.width,
                self.height,
                self.grids,
                self.expanded_strides,
            )
        else:
            raise Exception(
                f"{self.onnx_model_type} is currently not supported for onnx. See the docs for more info on supported models."
            )
