import logging
import numpy as np
import openvino.runtime as ov

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum
from typing import Literal
from pydantic import Extra, Field


logger = logging.getLogger(__name__)

DETECTOR_KEY = "openvino"


class OvDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]
    device: str = Field(default=None, title="Device Type")


class OvDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: OvDetectorConfig):
        self.ov_core = ov.Core()
        self.ov_model = self.ov_core.read_model(detector_config.model.path)
        self.ov_model_type = detector_config.model.model_type

        self.h = detector_config.model.height
        self.w = detector_config.model.width

        self.interpreter = self.ov_core.compile_model(
            model=self.ov_model, device_name=detector_config.device
        )

        logger.info(f"Model Input Shape: {self.interpreter.input(0).shape}")
        self.output_indexes = 0

        while True:
            try:
                tensor_shape = self.interpreter.output(self.output_indexes).shape
                logger.info(f"Model Output-{self.output_indexes} Shape: {tensor_shape}")
                self.output_indexes += 1
            except:
                logger.info(f"Model has {self.output_indexes} Output Tensors")
                break
        if self.ov_model_type == ModelTypeEnum.yolox:
            self.num_classes = tensor_shape[2] - 5
            logger.info(f"YOLOX model has {self.num_classes} classes")
            self.set_strides_grids()

    def set_strides_grids(self):
        grids = []
        expanded_strides = []

        strides = [8, 16, 32]

        hsizes = [self.h // stride for stride in strides]
        wsizes = [self.w // stride for stride in strides]

        for hsize, wsize, stride in zip(hsizes, wsizes, strides):
            xv, yv = np.meshgrid(np.arange(wsize), np.arange(hsize))
            grid = np.stack((xv, yv), 2).reshape(1, -1, 2)
            grids.append(grid)
            shape = grid.shape[:2]
            expanded_strides.append(np.full((*shape, 1), stride))
        self.grids = np.concatenate(grids, 1)
        self.expanded_strides = np.concatenate(expanded_strides, 1)

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
        infer_request = self.interpreter.create_infer_request()
        infer_request.infer([tensor_input])

        if self.ov_model_type == ModelTypeEnum.ssd:
            results = infer_request.get_output_tensor()

            detections = np.zeros((20, 6), np.float32)
            i = 0
            for object_detected in results.data[0, 0, :]:
                if object_detected[0] != -1:
                    logger.debug(object_detected)
                if object_detected[2] < 0.1 or i == 20:
                    break
                detections[i] = [
                    object_detected[1],  # Label ID
                    float(object_detected[2]),  # Confidence
                    object_detected[4],  # y_min
                    object_detected[3],  # x_min
                    object_detected[6],  # y_max
                    object_detected[5],  # x_max
                ]
                i += 1
            return detections
        elif self.ov_model_type == ModelTypeEnum.yolox:
            out_tensor = infer_request.get_output_tensor()
            # [x, y, h, w, box_score, class_no_1, ..., class_no_80],
            results = out_tensor.data
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
            dets = np.concatenate((image_pred[:, :5], class_conf, class_pred), axis=1)
            dets = dets[conf_mask]

            ordered = dets[dets[:, 5].argsort()[::-1]][:20]

            detections = np.zeros((20, 6), np.float32)

            for i, object_detected in enumerate(ordered):
                detections[i] = self.process_yolo(
                    object_detected[6], object_detected[5], object_detected[:4]
                )
            return detections
        elif self.ov_model_type == ModelTypeEnum.yolov8:
            out_tensor = infer_request.get_output_tensor()
            results = out_tensor.data[0]
            output_data = np.transpose(results)
            scores = np.max(output_data[:, 4:], axis=1)
            if len(scores) == 0:
                return np.zeros((20, 6), np.float32)
            scores = np.expand_dims(scores, axis=1)
            # add scores to the last column
            dets = np.concatenate((output_data, scores), axis=1)
            # filter out lines with scores below threshold
            dets = dets[dets[:, -1] > 0.5, :]
            # limit to top 20 scores, descending order
            ordered = dets[dets[:, -1].argsort()[::-1]][:20]
            detections = np.zeros((20, 6), np.float32)

            for i, object_detected in enumerate(ordered):
                detections[i] = self.process_yolo(
                    np.argmax(object_detected[4:-1]),
                    object_detected[-1],
                    object_detected[:4],
                )
            return detections
        elif self.ov_model_type == ModelTypeEnum.yolov5:
            out_tensor = infer_request.get_output_tensor()
            output_data = out_tensor.data[0]
            # filter out lines with scores below threshold
            conf_mask = (output_data[:, 4] >= 0.5).squeeze()
            output_data = output_data[conf_mask]
            # limit to top 20 scores, descending order
            ordered = output_data[output_data[:, 4].argsort()[::-1]][:20]

            detections = np.zeros((20, 6), np.float32)

            for i, object_detected in enumerate(ordered):
                detections[i] = self.process_yolo(
                    np.argmax(object_detected[5:]),
                    object_detected[4],
                    object_detected[:4],
                )
            return detections
