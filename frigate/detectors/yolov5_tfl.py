import time
import os
import sys
import logging
import os
import sys
import argparse
import logging
import time
from pathlib import Path

import numpy as np
import cv2

import yaml
import pycoral.utils.edgetpu as etpu
from pycoral.adapters import common
import json
import tflite_runtime.interpreter as tflite

from frigate.detectors.detection_api import DetectionApi
from frigate.util import load_labels


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EdgeTPUModel")


class YOLOv5Tfl(DetectionApi):
    def __init__(self, det_device=None, model_config=None):
        self.labels = load_labels(
            model_config.labelmap_path
        )  # Just to be able to print human readable labels

        """
        Creates an object for running a Yolov5 model on an EdgeTPU or a Desktop
        Inputs:
          - model_file: path to edgetpu-compiled tflite file
          - conf_thresh: detection threshold
          - iou_thresh: NMS threshold
          - desktop: option to run model on a desktop
          - filter_classes: only output certain classes
          - agnostic_nms: use class-agnostic NMS
          - max_det: max number of detections
        """

        self.model_file = model_config.path
        self.desktop = True  # Should be cpu?
        self.conf_thresh = 0.25
        self.iou_thresh = 0.45
        self.filter_classes = None
        # self.filter_classes = [15, 16] # cat, dog
        self.agnostic_nms = False
        self.max_det = 1000

        logger.info("Confidence threshold: {}".format(self.conf_thresh))
        logger.info("IOU threshold: {}".format(self.iou_thresh))

        self.inference_time = None
        self.nms_time = None
        self.interpreter = None
        self.colors = Colors()  # create instance for 'from utils.plots import colors'

        self.make_interpreter()
        input_size = self.get_image_size()
        x = (255 * np.random.random((3, *input_size))).astype(np.uint8)
        self.forward(x)

    def make_interpreter(self):
        """
        Internal function that loads the tflite file and creates
        the interpreter that deals with the EdgeTPU hardware.
        """
        # Load the model and allocate
        # Choose desktop or EdgTPU
        if self.desktop:
            self.interpreter = tflite.Interpreter(self.model_file)
        else:
            self.interpreter = etpu.make_interpreter(self.model_file)
        self.interpreter.allocate_tensors()

        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()

        logger.debug(self.input_details)
        logger.debug(self.output_details)

        self.input_zero = self.input_details[0]["quantization"][1]
        self.input_scale = self.input_details[0]["quantization"][0]
        self.output_zero = self.output_details[0]["quantization"][1]
        self.output_scale = self.output_details[0]["quantization"][0]

        # If the model isn't quantized then these should be zero
        # Check against small epsilon to avoid comparing float/int
        if self.input_scale < 1e-9:
            self.input_scale = 1.0

        if self.output_scale < 1e-9:
            self.output_scale = 1.0

        logger.debug("Input scale: {}".format(self.input_scale))
        logger.debug("Input zero: {}".format(self.input_zero))
        logger.debug("Output scale: {}".format(self.output_scale))
        logger.debug("Output zero: {}".format(self.output_zero))

        logger.info("Successfully loaded {}".format(self.model_file))

    def get_image_size(self):
        """
        Returns the expected size of the input image tensor
        """
        if self.interpreter is not None:
            self.input_size = common.input_size(self.interpreter)
            logger.debug("Expecting input shape: {}".format(self.input_size))
            return self.input_size
        else:
            logger.warning("Interpreter is not yet loaded")

    def detect_raw(self, tensor_input):
        raw_detections = self.detect_yolov5(tensor_input)
        return raw_detections

    def detect_yolov5(self, tensor_input):
        tensor_input = np.squeeze(tensor_input, axis=0)
        results = self.forward(tensor_input)
        det = results[0]
        detections = np.zeros((20, 6), np.float32)
        i = 0
        for *xyxy, conf, cls in det:
            detections[i] = [
                int(cls),
                float(conf),
                xyxy[1],
                xyxy[0],
                xyxy[3],
                xyxy[2],
            ]
            i += 1

        return detections

    def forward(self, x: np.ndarray, with_nms=True) -> np.ndarray:
        """
        Predict function using the EdgeTPU
        Inputs:
            x: (C, H, W) image tensor
            with_nms: apply NMS on output
        Returns:
            prediction array (with or without NMS applied)
        """
        tstart = time.time()
        # Transpose if C, H, W
        if x.shape[0] == 3:
            x = x.transpose((1, 2, 0))

        x = x.astype("float32")

        # Scale input, conversion is: real = (int_8 - zero)*scale
        x = (x / self.input_scale) + self.input_zero
        x = x[np.newaxis].astype(np.uint8)

        self.interpreter.set_tensor(self.input_details[0]["index"], x)
        self.interpreter.invoke()

        # Scale output
        result = (
            common.output_tensor(self.interpreter, 0).astype("float32")
            - self.output_zero
        ) * self.output_scale
        self.inference_time = time.time() - tstart

        if with_nms:

            tstart = time.time()
            nms_result = non_max_suppression(
                result,
                self.conf_thresh,
                self.iou_thresh,
                self.filter_classes,
                self.agnostic_nms,
                max_det=self.max_det,
            )
            self.nms_time = time.time() - tstart

            return nms_result

        else:
            return result

    def get_last_inference_time(self, with_nms=True):
        """
        Returns a tuple containing most recent inference and NMS time
        """
        res = [self.inference_time]

        if with_nms:
            res.append(self.nms_time)

        return res


class Colors:
    # Ultralytics color palette https://ultralytics.com/
    def __init__(self):
        # hex = matplotlib.colors.TABLEAU_COLORS.values()
        hex = (
            "FF3838",
            "FF9D97",
            "FF701F",
            "FFB21D",
            "CFD231",
            "48F90A",
            "92CC17",
            "3DDB86",
            "1A9334",
            "00D4BB",
            "2C99A8",
            "00C2FF",
            "344593",
            "6473FF",
            "0018EC",
            "8438FF",
            "520085",
            "CB38FF",
            "FF95C8",
            "FF37C7",
        )
        self.palette = [self.hex2rgb("#" + c) for c in hex]
        self.n = len(self.palette)

    def __call__(self, i, bgr=False):
        c = self.palette[int(i) % self.n]
        return (c[2], c[1], c[0]) if bgr else c

    @staticmethod
    def hex2rgb(h):  # rgb order (PIL)
        return tuple(int(h[1 + i : 1 + i + 2], 16) for i in (0, 2, 4))


def xyxy2xywh(x):
    # Convert nx4 boxes from [x1, y1, x2, y2] to [x, y, w, h] where xy1=top-left, xy2=bottom-right
    y = np.copy(x)
    y[:, 0] = (x[:, 0] + x[:, 2]) / 2  # x center
    y[:, 1] = (x[:, 1] + x[:, 3]) / 2  # y center
    y[:, 2] = x[:, 2] - x[:, 0]  # width
    y[:, 3] = x[:, 3] - x[:, 1]  # height
    return y


def xywh2xyxy(x):
    # Convert nx4 boxes from [x, y, w, h] to [x1, y1, x2, y2] where xy1=top-left, xy2=bottom-right
    y = np.copy(x)
    y[:, 0] = x[:, 0] - x[:, 2] / 2  # top left x
    y[:, 1] = x[:, 1] - x[:, 3] / 2  # top left y
    y[:, 2] = x[:, 0] + x[:, 2] / 2  # bottom right x
    y[:, 3] = x[:, 1] + x[:, 3] / 2  # bottom right y
    return y


def nms(dets, scores, thresh):
    """
    dets is a numpy array : num_dets, 4
    scores ia  nump array : num_dets,
    """

    x1 = dets[:, 0]
    y1 = dets[:, 1]
    x2 = dets[:, 2]
    y2 = dets[:, 3]

    areas = (x2 - x1 + 1e-9) * (y2 - y1 + 1e-9)
    order = scores.argsort()[::-1]  # get boxes with more ious first

    keep = []
    while order.size > 0:
        i = order[0]  # pick maxmum iou box
        other_box_ids = order[1:]
        keep.append(i)

        xx1 = np.maximum(x1[i], x1[other_box_ids])
        yy1 = np.maximum(y1[i], y1[other_box_ids])
        xx2 = np.minimum(x2[i], x2[other_box_ids])
        yy2 = np.minimum(y2[i], y2[other_box_ids])

        # print(list(zip(xx1, yy1, xx2, yy2)))

        w = np.maximum(0.0, xx2 - xx1 + 1e-9)  # maximum width
        h = np.maximum(0.0, yy2 - yy1 + 1e-9)  # maxiumum height
        inter = w * h

        ovr = inter / (areas[i] + areas[other_box_ids] - inter)

        inds = np.where(ovr <= thresh)[0]
        order = order[inds + 1]

    return np.array(keep)


def non_max_suppression(
    prediction,
    conf_thres=0.25,
    iou_thres=0.45,
    classes=None,
    agnostic=False,
    multi_label=False,
    labels=(),
    max_det=300,
):
    nc = prediction.shape[2] - 5  # number of classes
    xc = prediction[..., 4] > conf_thres  # candidates

    # Checks
    assert (
        0 <= conf_thres <= 1
    ), f"Invalid Confidence threshold {conf_thres}, valid values are between 0.0 and 1.0"
    assert (
        0 <= iou_thres <= 1
    ), f"Invalid IoU {iou_thres}, valid values are between 0.0 and 1.0"

    # Settings
    min_wh, max_wh = 2, 4096  # (pixels) minimum and maximum box width and height
    max_nms = 30000  # maximum number of boxes into torchvision.ops.nms()
    time_limit = 10.0  # seconds to quit after
    redundant = True  # require redundant detections
    multi_label &= nc > 1  # multiple labels per box (adds 0.5ms/img)
    merge = False  # use merge-NMS

    t = time.time()
    output = [np.zeros((0, 6))] * prediction.shape[0]
    for xi, x in enumerate(prediction):  # image index, image inference
        # Apply constraints
        # x[((x[..., 2:4] < min_wh) | (x[..., 2:4] > max_wh)).any(1), 4] = 0  # width-height
        x = x[xc[xi]]  # confidence

        # Cat apriori labels if autolabelling
        if labels and len(labels[xi]):
            l = labels[xi]
            v = np.zeros((len(l), nc + 5))
            v[:, :4] = l[:, 1:5]  # box
            v[:, 4] = 1.0  # conf
            v[range(len(l)), l[:, 0].long() + 5] = 1.0  # cls
            x = np.concatenate((x, v), 0)

        # If none remain process next image
        if not x.shape[0]:
            continue

        # Compute conf
        x[:, 5:] *= x[:, 4:5]  # conf = obj_conf * cls_conf

        # Box (center x, center y, width, height) to (x1, y1, x2, y2)
        box = xywh2xyxy(x[:, :4])

        # Detections matrix nx6 (xyxy, conf, cls)
        if multi_label:
            i, j = (x[:, 5:] > conf_thres).nonzero(as_tuple=False).T
            x = np.concatenate(
                (box[i], x[i, j + 5, None], j[:, None].astype(float)), axis=1
            )
        else:  # best class only
            conf = np.amax(x[:, 5:], axis=1, keepdims=True)
            j = np.argmax(x[:, 5:], axis=1).reshape(conf.shape)
            x = np.concatenate((box, conf, j.astype(float)), axis=1)[
                conf.flatten() > conf_thres
            ]

        # Filter by class
        if classes is not None:
            x = x[(x[:, 5:6] == np.array(classes)).any(1)]

        # Apply finite constraint
        # if not torch.isfinite(x).all():
        #     x = x[torch.isfinite(x).all(1)]

        # Check shape
        n = x.shape[0]  # number of boxes
        if not n:  # no boxes
            continue
        elif n > max_nms:  # excess boxes
            x = x[x[:, 4].argsort(descending=True)[:max_nms]]  # sort by confidence

        # Batched NMS
        c = x[:, 5:6] * (0 if agnostic else max_wh)  # classes
        boxes, scores = x[:, :4] + c, x[:, 4]  # boxes (offset by class), scores

        i = nms(boxes, scores, iou_thres)  # NMS

        if i.shape[0] > max_det:  # limit detections
            i = i[:max_det]
        if merge and (1 < n < 3e3):  # Merge NMS (boxes merged using weighted mean)
            # update boxes as boxes(i,4) = weights(i,n) * boxes(n,4)
            iou = box_iou(boxes[i], boxes) > iou_thres  # iou matrix
            weights = iou * scores[None]  # box weights
            x[i, :4] = np.dot(weights, x[:, :4]).astype(float) / weights.sum(
                1, keepdim=True
            )  # merged boxes
            if redundant:
                i = i[iou.sum(1) > 1]  # require redundancy

        output[xi] = x[i]
        if (time.time() - t) > time_limit:
            print(f"WARNING: NMS time limit {time_limit}s exceeded")
            break  # time limit exceeded

    return output
