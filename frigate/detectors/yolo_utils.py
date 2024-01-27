import logging

import numpy as np
import cv2

logger = logging.getLogger(__name__)

def yolov8_preprocess(tensor_input, model_input_shape):
  # tensor_input must be nhwc
  assert tensor_input.shape[3] == 3
  if tuple(tensor_input.shape[1:3]) != tuple(model_input_shape[2:4]):
    logger.warn(f"yolov8_preprocess: tensor_input.shape {tensor_input.shape} and model_input_shape {model_input_shape} do not match!")
  # cv2.dnn.blobFromImage is faster than numpying it
  return cv2.dnn.blobFromImage(tensor_input[0], 1.0 / 255, (model_input_shape[3], model_input_shape[2]), None, swapRB=False)

def yolov8_postprocess(model_input_shape, tensor_output, box_count = 20):
    model_box_count = tensor_output.shape[2]
    model_class_count = tensor_output.shape[1] - 4
    probs = tensor_output[0, 4:, :]
    all_ids = np.argmax(probs, axis=0)
    all_confidences = np.take(probs.T, model_class_count*np.arange(0, model_box_count) + all_ids)
    all_boxes = tensor_output[0, 0:4, :].T
    mask = (all_confidences > 0.30)
    class_ids = all_ids[mask]
    confidences = all_confidences[mask]
    cx, cy, w, h = all_boxes[mask].T
    scale_y, scale_x = 1 / model_input_shape[2], 1 / model_input_shape[3]
    detections = np.stack((class_ids, confidences, scale_y * (cy - h / 2), scale_x * (cx - w / 2), scale_y * (cy + h / 2), scale_x * (cx + w / 2)), axis=1)
    if detections.shape[0] > box_count:
        detections = detections[np.argpartition(detections[:,1], -box_count)[-box_count:]]
    detections.resize((box_count, 6))
    return detections

