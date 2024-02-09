import logging

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def preprocess(tensor_input, model_input_shape, model_input_element_type):
    model_input_shape = tuple(model_input_shape)
    assert tensor_input.dtype == np.uint8, f"tensor_input.dtype: {tensor_input.dtype}"
    if len(tensor_input.shape) == 3:
        tensor_input = tensor_input[np.newaxis, :]
    if model_input_element_type == np.uint8:
        # nothing to do for uint8 model input
        assert (
            model_input_shape == tensor_input.shape
        ), f"model_input_shape: {model_input_shape}, tensor_input.shape: {tensor_input.shape}"
        return tensor_input
    assert (
        model_input_element_type == np.float32
    ), f"model_input_element_type: {model_input_element_type}"
    # tensor_input must be nhwc
    assert tensor_input.shape[3] == 3, f"tensor_input.shape: {tensor_input.shape}"
    if tensor_input.shape[1:3] != model_input_shape[2:4]:
        logger.warn(
            f"preprocess: tensor_input.shape {tensor_input.shape} and model_input_shape {model_input_shape} do not match!"
        )
    # cv2.dnn.blobFromImage is faster than numpying it
    return cv2.dnn.blobFromImage(
        tensor_input[0],
        1.0 / 255,
        (model_input_shape[3], model_input_shape[2]),
        None,
        swapRB=False,
    )


def yolov8_postprocess(
    model_input_shape,
    tensor_output,
    box_count=20,
    score_threshold=0.5,
    nms_threshold=0.5,
):
    model_box_count = tensor_output.shape[2]
    probs = tensor_output[0, 4:, :]
    all_ids = np.argmax(probs, axis=0)
    all_confidences = probs.T[np.arange(model_box_count), all_ids]
    all_boxes = tensor_output[0, 0:4, :].T
    mask = all_confidences > score_threshold
    class_ids = all_ids[mask]
    confidences = all_confidences[mask]
    cx, cy, w, h = all_boxes[mask].T

    if model_input_shape[3] == 3:
        scale_y, scale_x = 1 / model_input_shape[1], 1 / model_input_shape[2]
    else:
        scale_y, scale_x = 1 / model_input_shape[2], 1 / model_input_shape[3]
    detections = np.stack(
        (
            class_ids,
            confidences,
            scale_y * (cy - h / 2),
            scale_x * (cx - w / 2),
            scale_y * (cy + h / 2),
            scale_x * (cx + w / 2),
        ),
        axis=1,
    )
    if detections.shape[0] > box_count:
        # if too many detections, do nms filtering to suppress overlapping boxes
        boxes = np.stack((cx - w / 2, cy - h / 2, w, h), axis=1)
        indexes = cv2.dnn.NMSBoxes(boxes, confidences, score_threshold, nms_threshold)
        detections = detections[indexes]
        # if still too many, trim the rest by confidence
        if detections.shape[0] > box_count:
            detections = detections[
                np.argpartition(detections[:, 1], -box_count)[-box_count:]
            ]
        detections = detections.copy()
    detections.resize((box_count, 6))
    return detections
