import time
import os
import sys
import logging

import yaml
import numpy as np
import pycoral.utils.edgetpu as etpu
from pycoral.adapters import common
from frigate.yolov5.nms import non_max_suppression
import cv2
import json
import tflite_runtime.interpreter as tflite
from frigate.yolov5.utils import plot_one_box, Colors, get_image_tensor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EdgeTPUModel")


class EdgeTPUModel:

    def __init__(self, model_file, names_file, conf_thresh=0.25, iou_thresh=0.45, desktop=True, filter_classes=None,
                 agnostic_nms=False, max_det=1000):
        """
        Creates an object for running a Yolov5 model on an EdgeTPU or a Desktop

        Inputs:
          - model_file: path to edgetpu-compiled tflite file
          - names_file: yaml names file (yolov5 format)
          - conf_thresh: detection threshold
          - iou_thresh: NMS threshold
          - desktop: option to run model on a desktop
          - filter_classes: only output certain classes
          - agnostic_nms: use class-agnostic NMS
          - max_det: max number of detections
        """

        model_file = os.path.abspath(model_file)

        if not model_file.endswith('tflite'):
            model_file += ".tflite"

        self.model_file = model_file
        self.conf_thresh = conf_thresh
        self.iou_thresh = iou_thresh
        self.desktop = desktop
        self.filter_classes = filter_classes
        self.agnostic_nms = agnostic_nms
        self.max_det = 1000

        logger.info("Confidence threshold: {}".format(conf_thresh))
        logger.info("IOU threshold: {}".format(iou_thresh))

        self.inference_time = None
        self.nms_time = None
        self.interpreter = None
        self.colors = Colors()  # create instance for 'from utils.plots import colors'

        #self.get_names(names_file)
        self.names = ['person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
            'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
            'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
            'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
            'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
            'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
            'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
            'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
            'hair drier', 'toothbrush']
        self.make_interpreter()
        self.get_image_size()

    def get_names(self, path):
        """
        Load a names file

        Inputs:
          - path: path to names file in yaml format
        """

        with open(path, 'r') as f:
            cfg = yaml.load(f, Loader=yaml.SafeLoader)

        names = cfg['names']
        logger.info("Loaded {} classes".format(len(names)))

        self.names = names

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

        self.input_zero = self.input_details[0]['quantization'][1]
        self.input_scale = self.input_details[0]['quantization'][0]
        self.output_zero = self.output_details[0]['quantization'][1]
        self.output_scale = self.output_details[0]['quantization'][0]

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
            logger.warn("Interpreter is not yet loaded")

    def predict(self, image_path, save_img=True, save_txt=True):
        logger.info("Attempting to load {}".format(image_path))

        full_image, net_image, pad = get_image_tensor(image_path, self.input_size[0])
        pred = self.forward(net_image)
        logger.info("Inference time: {}".format(self.inference_time))

        base, ext = os.path.splitext(image_path)

        output_path = base + "_detect" + ext
        det = self.process_predictions(pred[0], full_image, pad, output_path, save_img=save_img, save_txt=save_txt)

        return det

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

        x = x.astype('float32')

        # Scale input, conversion is: real = (int_8 - zero)*scale
        x = (x / self.input_scale) + self.input_zero
        x = x[np.newaxis].astype(np.uint8)

        self.interpreter.set_tensor(self.input_details[0]['index'], x)
        self.interpreter.invoke()

        # Scale output
        result = (common.output_tensor(self.interpreter, 0).astype('float32') - self.output_zero) * self.output_scale
        self.inference_time = time.time() - tstart

        if with_nms:

            tstart = time.time()
            nms_result = non_max_suppression(result, self.conf_thresh, self.iou_thresh, self.filter_classes,
                                             self.agnostic_nms, max_det=self.max_det)
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

    def get_scaled_coords(self, xyxy, output_image, pad):
        """
        Converts raw prediction bounding box to orginal
        image coordinates.

        Args:
          xyxy: array of boxes
          output_image: np array
          pad: padding due to image resizing (pad_w, pad_h)
        """
        pad_w, pad_h = pad
        in_h, in_w = self.input_size
        out_h, out_w, _ = output_image.shape

        ratio_w = out_w / (in_w - pad_w)
        ratio_h = out_h / (in_h - pad_h)

        out = []
        for coord in xyxy:
            x1, y1, x2, y2 = coord

            x1 *= in_w * ratio_w
            x2 *= in_w * ratio_w
            y1 *= in_h * ratio_h
            y2 *= in_h * ratio_h

            x1 = max(0, x1)
            x2 = min(out_w, x2)

            y1 = max(0, y1)
            y2 = min(out_h, y2)

            out.append((x1, y1, x2, y2))

        return np.array(out).astype(int)

    def process_predictions2(self, det):
        """
        Process predictions and optionally output an image with annotations
        """
        if len(det):
            # Rescale boxes from img_size to im0 size
            # x1, y1, x2, y2=
            #det[:, :4] = self.get_scaled_coords(det[:, :4], output_image, pad)
            output = {}
            #base, ext = os.path.splitext(output_path)

            s = ""

            # Print results
            for c in np.unique(det[:, -1]):
                n = (det[:, -1] == c).sum()  # detections per class
                s += f"{n} {self.names[int(c)]}{'s' * (n > 1)}, "  # add to string

            if s != "":
                s = s.strip()
                s = s[:-1]

            logger.info("Detected: {}".format(s))

            for *xyxy, conf, cls in reversed(det):
                output = {}
                output['box'] = xyxy
                output['conf'] = conf
                output['cls'] = cls
                output['cls_name'] = self.names[c]
        return output

    def process_predictions(self, det, output_image=None, pad=(0, 0), output_path="detection.jpg", save_img=False, save_txt=False,
                            hide_labels=False, hide_conf=False):
        """
        Process predictions and optionally output an image with annotations
        """
        if len(det):
            # Rescale boxes from img_size to im0 size
            # x1, y1, x2, y2=
            det[:, :4] = self.get_scaled_coords(det[:, :4], output_image, pad)
            output = {}
            base, ext = os.path.splitext(output_path)

            s = ""

            # Print results
            for c in np.unique(det[:, -1]):
                n = (det[:, -1] == c).sum()  # detections per class
                s += f"{n} {self.names[int(c)]}{'s' * (n > 1)}, "  # add to string

            if s != "":
                s = s.strip()
                s = s[:-1]

            logger.info("Detected: {}".format(s))

            # Write results
            for *xyxy, conf, cls in reversed(det):
                if save_img:  # Add bbox to image
                    c = int(cls)  # integer class
                    label = None if hide_labels else (self.names[c] if hide_conf else f'{self.names[c]} {conf:.2f}')
                    output_image = plot_one_box(xyxy, output_image, label=label, color=self.colors(c, True))
                if save_txt:
                    output[base] = {}
                    output[base]['box'] = xyxy
                    output[base]['conf'] = conf
                    output[base]['cls'] = cls
                    output[base]['cls_name'] = self.names[c]

            if save_txt:
                output_txt = base + "txt"
                with open(output_txt, 'w') as f:
                    json.dump(output, f, indent=1)
            if save_img:
                cv2.imwrite(output_path, output_image)

        return det