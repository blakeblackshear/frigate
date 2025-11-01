import logging
import os.path
import re
import urllib.request
from typing import Literal

import cv2
import numpy as np
from pydantic import Field

from frigate.const import MODEL_CACHE_DIR
from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum
from frigate.util.model import post_process_yolo

import axengine as axe
from axengine import axclrt_provider_name, axengine_provider_name

logger = logging.getLogger(__name__)

DETECTOR_KEY = "axengine"

CONF_THRESH = 0.65
IOU_THRESH = 0.45
STRIDES = [8, 16, 32]
ANCHORS = [
    [10, 13, 16, 30, 33, 23],
    [30, 61, 62, 45, 59, 119],
    [116, 90, 156, 198, 373, 326],
]

class AxengineDetectorConfig(BaseDetectorConfig):
    type: Literal[DETECTOR_KEY]

class Axengine(DetectionApi):
    type_key = DETECTOR_KEY
    def __init__(self, config: AxengineDetectorConfig):
        logger.info("__init__ axengine")
        super().__init__(config)
        self.height = config.model.height
        self.width = config.model.width
        model_path = config.model.path or "yolov5s_320"
        self.session = axe.InferenceSession(f"/axmodels/{model_path}.axmodel")

    def __del__(self):
        pass

    def xywh2xyxy(self, x):
        # Convert nx4 boxes from [x, y, w, h] to [x1, y1, x2, y2] where xy1=top-left, xy2=bottom-right
        y = np.copy(x)
        y[:, 0] = x[:, 0] - x[:, 2] / 2  # top left x
        y[:, 1] = x[:, 1] - x[:, 3] / 2  # top left y
        y[:, 2] = x[:, 0] + x[:, 2] / 2  # bottom right x
        y[:, 3] = x[:, 1] + x[:, 3] / 2  # bottom right y
        return y

    def bboxes_iou(self, boxes1, boxes2):
        """calculate the Intersection Over Union value"""
        boxes1 = np.array(boxes1)
        boxes2 = np.array(boxes2)

        boxes1_area = (boxes1[..., 2] - boxes1[..., 0]) * (
            boxes1[..., 3] - boxes1[..., 1]
        )
        boxes2_area = (boxes2[..., 2] - boxes2[..., 0]) * (
            boxes2[..., 3] - boxes2[..., 1]
        )

        left_up = np.maximum(boxes1[..., :2], boxes2[..., :2])
        right_down = np.minimum(boxes1[..., 2:], boxes2[..., 2:])

        inter_section = np.maximum(right_down - left_up, 0.0)
        inter_area = inter_section[..., 0] * inter_section[..., 1]
        union_area = boxes1_area + boxes2_area - inter_area
        ious = np.maximum(1.0 * inter_area / union_area, np.finfo(np.float32).eps)

        return ious

    def nms(self, proposals, iou_threshold, conf_threshold, multi_label=False):
        """
        :param bboxes: (xmin, ymin, xmax, ymax, score, class)

        Note: soft-nms, https://arxiv.org/pdf/1704.04503.pdf
            https://github.com/bharatsingh430/soft-nms
        """
        xc = proposals[..., 4] > conf_threshold
        proposals = proposals[xc]
        proposals[:, 5:] *= proposals[:, 4:5]
        bboxes = self.xywh2xyxy(proposals[:, :4])
        if multi_label:
            mask = proposals[:, 5:] > conf_threshold
            nonzero_indices = np.argwhere(mask)
            if nonzero_indices.size < 0:
                return
            i, j = nonzero_indices.T
            bboxes = np.hstack(
                (bboxes[i], proposals[i, j + 5][:, None], j[:, None].astype(float))
            )
        else:
            confidences = proposals[:, 5:]
            conf = confidences.max(axis=1, keepdims=True)
            j = confidences.argmax(axis=1)[:, None]

            new_x_parts = [bboxes, conf, j.astype(float)]
            bboxes = np.hstack(new_x_parts)

            mask = conf.reshape(-1) > conf_threshold
            bboxes = bboxes[mask]

        classes_in_img = list(set(bboxes[:, 5]))
        bboxes = bboxes[bboxes[:, 4].argsort()[::-1][:300]]
        best_bboxes = []

        for cls in classes_in_img:
            cls_mask = bboxes[:, 5] == cls
            cls_bboxes = bboxes[cls_mask]

            while len(cls_bboxes) > 0:
                max_ind = np.argmax(cls_bboxes[:, 4])
                best_bbox = cls_bboxes[max_ind]
                best_bboxes.append(best_bbox)
                cls_bboxes = np.concatenate(
                    [cls_bboxes[:max_ind], cls_bboxes[max_ind + 1 :]]
                )
                iou = self.bboxes_iou(best_bbox[np.newaxis, :4], cls_bboxes[:, :4])
                weight = np.ones((len(iou),), dtype=np.float32)

                iou_mask = iou > iou_threshold
                weight[iou_mask] = 0.0

                cls_bboxes[:, 4] = cls_bboxes[:, 4] * weight
                score_mask = cls_bboxes[:, 4] > 0.0
                cls_bboxes = cls_bboxes[score_mask]

        if len(best_bboxes) == 0:
            return np.empty((0, 6))

        best_bboxes = np.vstack(best_bboxes)
        best_bboxes = best_bboxes[best_bboxes[:, 4].argsort()[::-1]]
        return best_bboxes

    def sigmoid(self, x):
        return np.clip(0.2 * x + 0.5, 0, 1)

    def gen_proposals(self, outputs):
        new_pred = []
        anchor_grid = np.array(ANCHORS).reshape(-1, 1, 1, 3, 2)
        for i, pred in enumerate(outputs):
            pred = self.sigmoid(pred)
            n, h, w, c = pred.shape

            pred = pred.reshape(n, h, w, 3, 85)
            conv_shape = pred.shape
            output_size = conv_shape[1]
            conv_raw_dxdy = pred[..., 0:2]
            conv_raw_dwdh = pred[..., 2:4]
            xy_grid = np.meshgrid(np.arange(output_size), np.arange(output_size))
            xy_grid = np.expand_dims(np.stack(xy_grid, axis=-1), axis=2)

            xy_grid = np.tile(np.expand_dims(xy_grid, axis=0), [1, 1, 1, 3, 1])
            xy_grid = xy_grid.astype(np.float32)
            pred_xy = (conv_raw_dxdy * 2.0 - 0.5 + xy_grid) * STRIDES[i]
            pred_wh = (conv_raw_dwdh * 2) ** 2 * anchor_grid[i]
            pred[:, :, :, :, 0:4] = np.concatenate([pred_xy, pred_wh], axis=-1)

            new_pred.append(np.reshape(pred, (-1, np.shape(pred)[-1])))

        return np.concatenate(new_pred, axis=0)

    def post_processing(self, outputs, input_shape, threshold=0.3):
        proposals = self.gen_proposals(outputs)
        bboxes = self.nms(proposals, IOU_THRESH, CONF_THRESH, multi_label=True)

        """
        bboxes: [x_min, y_min, x_max, y_max, probability, cls_id] format coordinates.
        """

        results = np.zeros((20, 6), np.float32)

        for i, bbox in enumerate(bboxes):
            if i >= 20:
                break
            coor = np.array(bbox[:4], dtype=np.int32)
            score = bbox[4]
            if score < threshold:
                continue
            class_ind = int(bbox[5])
            results[i] = [
                class_ind,
                score,
                max(0, bbox[1]) / input_shape[1],
                max(0, bbox[0]) / input_shape[0],
                min(1, bbox[3] / input_shape[1]),
                min(1, bbox[2] / input_shape[0]),
            ]
        return results

    def detect_raw(self, tensor_input):
        results = None
        results = self.session.run(None, {"images": tensor_input})
        return self.post_processing(results, (self.width, self.height))
