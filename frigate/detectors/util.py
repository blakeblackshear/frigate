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
    # cv2.dnn.blobFromImage is faster than running it through numpy
    return cv2.dnn.blobFromImage(
        tensor_input[0],
        1.0 / 255,
        (model_input_shape[3], model_input_shape[2]),
        None,
        swapRB=False,
    )
