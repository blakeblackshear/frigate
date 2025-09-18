import logging

import numpy as np
import openvino as ov
from pydantic import Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detection_runners import OpenVINOModelRunner
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum
from frigate.util.model import (
    post_process_dfine,
    post_process_rfdetr,
    post_process_yolo,
)

logger = logging.getLogger(__name__)

DETECTOR_KEY = "openvino"


class OvDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    device: str = Field(default=None, title="Device Type")


class OvDetector(DetectionApi):
    type_key = DETECTOR_KEY
    supported_models = [
        ModelTypeEnum.dfine,
        ModelTypeEnum.rfdetr,
        ModelTypeEnum.ssd,
        ModelTypeEnum.yolonas,
        ModelTypeEnum.yologeneric,
        ModelTypeEnum.yolox,
    ]

    def __init__(self, detector_config: OvDetectorConfig):
        super().__init__(detector_config)
        self.ov_model_type = detector_config.model.model_type

        self.h = detector_config.model.height
        self.w = detector_config.model.width

        self.runner = OpenVINOModelRunner(
            model_path=detector_config.model.path,
            device=detector_config.device,
            model_type=detector_config.model.model_type,
        )

        # For dfine models, also pre-allocate target sizes tensor
        if self.ov_model_type == ModelTypeEnum.dfine:
            self.target_sizes_tensor = ov.Tensor(
                np.array([[self.h, self.w]], dtype=np.int64)
            )

        self.model_invalid = False

        if self.ov_model_type not in self.supported_models:
            logger.error(
                f"OpenVino detector does not support {self.ov_model_type} models."
            )
            self.model_invalid = True

        if self.ov_model_type == ModelTypeEnum.ssd:
            model_inputs = self.runner.compiled_model.inputs
            model_outputs = self.runner.compiled_model.outputs

            if len(model_inputs) != 1:
                logger.error(
                    f"SSD models must only have 1 input. Found {len(model_inputs)}."
                )
                self.model_invalid = True
            if len(model_outputs) != 1:
                logger.error(
                    f"SSD models must only have 1 output. Found {len(model_outputs)}."
                )
                self.model_invalid = True

            output_shape = model_outputs[0].get_shape()
            if output_shape[0] != 1 or output_shape[1] != 1 or output_shape[3] != 7:
                logger.error(f"SSD model output doesn't match. Found {output_shape}.")
                self.model_invalid = True

        if self.ov_model_type == ModelTypeEnum.yolonas:
            model_inputs = self.runner.compiled_model.inputs
            model_outputs = self.runner.compiled_model.outputs

            if len(model_inputs) != 1:
                logger.error(
                    f"YoloNAS models must only have 1 input. Found {len(model_inputs)}."
                )
                self.model_invalid = True
            if len(model_outputs) != 1:
                logger.error(
                    f"YoloNAS models must be exported in flat format and only have 1 output. Found {len(model_outputs)}."
                )
                self.model_invalid = True
            output_shape = model_outputs[0].partial_shape
            if output_shape[-1] != 7:
                logger.error(
                    f"YoloNAS models must be exported in flat format. Model output doesn't match. Found {output_shape}."
                )
                self.model_invalid = True

        if self.ov_model_type == ModelTypeEnum.yolox:
            self.output_indexes = 0
            while True:
                try:
                    tensor_shape = self.runner.compiled_model.output(
                        self.output_indexes
                    ).shape
                    logger.info(
                        f"Model Output-{self.output_indexes} Shape: {tensor_shape}"
                    )
                    self.output_indexes += 1
                except Exception:
                    logger.info(f"Model has {self.output_indexes} Output Tensors")
                    break
            self.num_classes = tensor_shape[2] - 5
            logger.info(f"YOLOX model has {self.num_classes} classes")
            self.calculate_grids_strides()

    ## Takes in class ID, confidence score, and array of [x, y, w, h] that describes detection position,
    ## returns an array that's easily passable back to Frigate.
    def process_yolo(self, class_id, conf, pos):
        return [
            class_id,  # class ID
            conf,  # confidence score
            (pos[1] - (pos[3] / 2)) / self.h,  # y_min
            (pos[0] - (pos[2] / 2)) / self.w,  # x_min
            (pos[1] + (pos[3] / 2)) / self.h,  # y_max
            (pos[0] + (pos[2] / 2)) / self.w,  # x_max
        ]

    def detect_raw(self, tensor_input):
        if self.model_invalid:
            return np.zeros((20, 6), np.float32)

        if self.ov_model_type == ModelTypeEnum.dfine:
            # Use named inputs for dfine models
            inputs = {
                "images": tensor_input,
                "orig_target_sizes": np.array([[self.h, self.w]], dtype=np.int64),
            }
            outputs = self.runner.run(inputs)
            tensor_output = (
                outputs[0],
                outputs[1],
                outputs[2],
            )
            return post_process_dfine(tensor_output, self.w, self.h)

        # Run inference using the runner
        input_name = self.runner.get_input_names()[0]
        outputs = self.runner.run({input_name: tensor_input})

        detections = np.zeros((20, 6), np.float32)

        if self.ov_model_type == ModelTypeEnum.rfdetr:
            return post_process_rfdetr(outputs)
        elif self.ov_model_type == ModelTypeEnum.ssd:
            results = outputs[0][0][0]

            for i, (_, class_id, score, xmin, ymin, xmax, ymax) in enumerate(results):
                if i == 20:
                    break
                detections[i] = [
                    class_id,
                    float(score),
                    ymin,
                    xmin,
                    ymax,
                    xmax,
                ]
            return detections
        elif self.ov_model_type == ModelTypeEnum.yolonas:
            predictions = outputs[0]

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
        elif self.ov_model_type == ModelTypeEnum.yologeneric:
            return post_process_yolo(outputs, self.w, self.h)
        elif self.ov_model_type == ModelTypeEnum.yolox:
            # [x, y, h, w, box_score, class_no_1, ..., class_no_80],
            results = outputs[0]
            results[..., :2] = (results[..., :2] + self.grids) * self.expanded_strides
            results[..., 2:4] = np.exp(results[..., 2:4]) * self.expanded_strides
            image_pred = results[0, ...]

            class_conf = np.max(
                image_pred[:, 5 : 5 + self.num_classes], axis=1, keepdims=True
            )
            class_pred = np.argmax(image_pred[:, 5 : 5 + self.num_classes], axis=1)
            class_pred = np.expand_dims(class_pred, axis=1)

            conf_mask = (image_pred[:, 4] * class_conf.squeeze() >= 0.3).squeeze()
            # Detections ordered as (x1, y1, x2, y2, obj_conf, class_conf, class_pred)
            detections = np.concatenate(
                (image_pred[:, :5], class_conf, class_pred), axis=1
            )
            detections = detections[conf_mask]

            ordered = detections[detections[:, 5].argsort()[::-1]][:20]

            for i, object_detected in enumerate(ordered):
                detections[i] = self.process_yolo(
                    object_detected[6], object_detected[5], object_detected[:4]
                )
            return detections
