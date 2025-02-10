import logging

import cv2
import numpy as np
from pydantic import Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import (
    BaseDetectorConfig,
    ModelTypeEnum,
)
from frigate.util.model import get_ort_providers

logger = logging.getLogger(__name__)

DETECTOR_KEY = "onnx"


class ONNXDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    device: str = Field(default="AUTO", title="Device Type")


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

        providers, options = get_ort_providers(
            detector_config.device == "CPU", detector_config.device
        )
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

    def detect_raw(self, tensor_input: np.ndarray):
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
        elif self.onnx_model_type == ModelTypeEnum.yolov9:
            # see https://github.com/MultimediaTechLab/YOLO/blob/main/yolo/utils/bounding_box_utils.py#L338
            predictions: np.ndarray = tensor_output[0]
            predictions = np.squeeze(predictions).T
            scores = np.max(predictions[:, 4:], axis=1)
            predictions = predictions[scores > 0.4, :]
            scores = scores[scores > 0.4]
            class_ids = np.argmax(predictions[:, 4:], axis=1)

            # Rescale box
            boxes = predictions[:, :4]

            input_shape = np.array([self.w, self.h, self.w, self.h])
            boxes = np.divide(boxes, input_shape, dtype=np.float32)
            indices = cv2.dnn.NMSBoxes(
                boxes, scores, score_threshold=0.4, nms_threshold=0.4
            )
            detections = np.zeros((20, 6), np.float32)
            for i, (bbox, confidence, class_id) in enumerate(
                zip(boxes[indices], scores[indices], class_ids[indices])
            ):
                if i == 20:
                    break

                detections[i] = [
                    class_id,
                    confidence,
                    bbox[1] - bbox[3] / 2,
                    bbox[0] - bbox[2] / 2,
                    bbox[1] + bbox[3] / 2,
                    bbox[0] + bbox[2] / 2,
                ]

            return detections
        else:
            raise Exception(
                f"{self.onnx_model_type} is currently not supported for rocm. See the docs for more info on supported models."
            )
