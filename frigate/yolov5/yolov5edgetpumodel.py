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


class Yolov5EdgeTPUModel:

    def __init__(self, model_file, desktop=True, conf_thresh=0.25, iou_thresh=0.45, filter_classes=None,
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

        self.make_interpreter()
        self.get_image_size()

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
            logger.warning("Interpreter is not yet loaded")

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
