"""Model Utils"""

import logging
import os
from typing import Any

import cv2
import numpy as np
import onnxruntime as ort

from frigate.const import MODEL_CACHE_DIR

logger = logging.getLogger(__name__)


### Post Processing


def post_process_dfine(
    tensor_output: np.ndarray, width: int, height: int
) -> np.ndarray:
    class_ids = tensor_output[0][tensor_output[2] > 0.4]
    boxes = tensor_output[1][tensor_output[2] > 0.4]
    scores = tensor_output[2][tensor_output[2] > 0.4]

    input_shape = np.array([height, width, height, width])
    boxes = np.divide(boxes, input_shape, dtype=np.float32)
    indices = cv2.dnn.NMSBoxes(boxes, scores, score_threshold=0.4, nms_threshold=0.4)
    detections = np.zeros((20, 6), np.float32)

    for i, (bbox, confidence, class_id) in enumerate(
        zip(boxes[indices], scores[indices], class_ids[indices])
    ):
        if i == 20:
            break

        detections[i] = [
            class_id,
            confidence,
            bbox[1],
            bbox[0],
            bbox[3],
            bbox[2],
        ]

    return detections


def post_process_rfdetr(tensor_output: list[np.ndarray, np.ndarray]) -> np.ndarray:
    boxes = tensor_output[0]
    raw_scores = tensor_output[1]

    # apply soft max to scores
    exp = np.exp(raw_scores - np.max(raw_scores, axis=-1, keepdims=True))
    all_scores = exp / np.sum(exp, axis=-1, keepdims=True)

    # get highest scoring class from every detection
    scores = np.max(all_scores[0, :, 1:], axis=-1)
    labels = np.argmax(all_scores[0, :, 1:], axis=-1)

    idxs = scores > 0.4
    filtered_boxes = boxes[0, idxs]
    filtered_scores = scores[idxs]
    filtered_labels = labels[idxs]

    # convert boxes from [x_center, y_center, width, height]
    x_center, y_center, w, h = (
        filtered_boxes[:, 0],
        filtered_boxes[:, 1],
        filtered_boxes[:, 2],
        filtered_boxes[:, 3],
    )
    x_min = x_center - w / 2
    y_min = y_center - h / 2
    x_max = x_center + w / 2
    y_max = y_center + h / 2
    filtered_boxes = np.stack([x_min, y_min, x_max, y_max], axis=-1)

    # apply nms
    indices = cv2.dnn.NMSBoxes(
        filtered_boxes, filtered_scores, score_threshold=0.4, nms_threshold=0.4
    )
    detections = np.zeros((20, 6), np.float32)

    for i, (bbox, confidence, class_id) in enumerate(
        zip(filtered_boxes[indices], filtered_scores[indices], filtered_labels[indices])
    ):
        if i == 20:
            break

        detections[i] = [
            class_id,
            confidence,
            bbox[1],
            bbox[0],
            bbox[3],
            bbox[2],
        ]

    return detections


def __post_process_multipart_yolo(
    output_list,
    width,
    height,
):
    anchors = [
        [(12, 16), (19, 36), (40, 28)],
        [(36, 75), (76, 55), (72, 146)],
        [(142, 110), (192, 243), (459, 401)],
    ]

    stride_map = {0: 8, 1: 16, 2: 32}

    all_boxes = []
    all_scores = []
    all_class_ids = []

    for i, output in enumerate(output_list):
        bs, _, ny, nx = output.shape
        stride = stride_map[i]
        anchor_set = anchors[i]

        num_anchors = len(anchor_set)
        output = output.reshape(bs, num_anchors, 85, ny, nx)
        output = output.transpose(0, 1, 3, 4, 2)
        output = output[0]

        for a_idx, (anchor_w, anchor_h) in enumerate(anchor_set):
            for y in range(ny):
                for x in range(nx):
                    pred = output[a_idx, y, x]
                    class_probs = pred[5:]
                    class_id = np.argmax(class_probs)
                    class_conf = class_probs[class_id]
                    conf = class_conf * pred[4]

                    if conf < 0.4:
                        continue

                    dx = pred[0]
                    dy = pred[1]
                    dw = pred[2]
                    dh = pred[3]

                    bx = ((dx * 2.0 - 0.5) + x) * stride
                    by = ((dy * 2.0 - 0.5) + y) * stride
                    bw = ((dw * 2.0) ** 2) * anchor_w
                    bh = ((dh * 2.0) ** 2) * anchor_h

                    x1 = max(0, bx - bw / 2)
                    y1 = max(0, by - bh / 2)
                    x2 = min(width, bx + bw / 2)
                    y2 = min(height, by + bh / 2)

                    all_boxes.append([x1, y1, x2, y2])
                    all_scores.append(conf)
                    all_class_ids.append(class_id)

    indices = cv2.dnn.NMSBoxes(
        bboxes=all_boxes,
        scores=all_scores,
        score_threshold=0.4,
        nms_threshold=0.4,
    )

    results = np.zeros((20, 6), np.float32)

    if len(indices) > 0:
        for i, idx in enumerate(indices.flatten()[:20]):
            class_id = all_class_ids[idx]
            conf = all_scores[idx]
            x1, y1, x2, y2 = all_boxes[idx]
            results[i] = [
                class_id,
                conf,
                y1 / height,
                x1 / width,
                y2 / height,
                x2 / width,
            ]

    return results


def __post_process_nms_yolo(predictions: np.ndarray, width, height) -> np.ndarray:
    predictions = np.squeeze(predictions)

    # transpose the output so it has order (inferences, class_ids)
    if predictions.shape[0] < predictions.shape[1]:
        predictions = predictions.T

    scores = np.max(predictions[:, 4:], axis=1)
    predictions = predictions[scores > 0.4, :]
    scores = scores[scores > 0.4]
    class_ids = np.argmax(predictions[:, 4:], axis=1)

    # Rescale box
    boxes = predictions[:, :4]
    boxes_xyxy = np.ones_like(boxes)
    boxes_xyxy[:, 0] = boxes[:, 0] - boxes[:, 2] / 2
    boxes_xyxy[:, 1] = boxes[:, 1] - boxes[:, 3] / 2
    boxes_xyxy[:, 2] = boxes[:, 0] + boxes[:, 2] / 2
    boxes_xyxy[:, 3] = boxes[:, 1] + boxes[:, 3] / 2
    boxes = boxes_xyxy

    # run NMS
    indices = cv2.dnn.NMSBoxes(boxes, scores, score_threshold=0.4, nms_threshold=0.4)
    detections = np.zeros((20, 6), np.float32)
    for i, (bbox, confidence, class_id) in enumerate(
        zip(boxes[indices], scores[indices], class_ids[indices])
    ):
        if i == 20:
            break

        detections[i] = [
            class_id,
            confidence,
            bbox[1] / height,
            bbox[0] / width,
            bbox[3] / height,
            bbox[2] / width,
        ]

    return detections


def post_process_yolo(output: list[np.ndarray], width: int, height: int) -> np.ndarray:
    if len(output) > 1:
        return __post_process_multipart_yolo(output, width, height)
    else:
        return __post_process_nms_yolo(output[0], width, height)


def post_process_yolox(
    predictions: np.ndarray,
    width: int,
    height: int,
    grids: np.ndarray,
    expanded_strides: np.ndarray,
) -> np.ndarray:
    predictions[..., :2] = (predictions[..., :2] + grids) * expanded_strides
    predictions[..., 2:4] = np.exp(predictions[..., 2:4]) * expanded_strides

    # process organized predictions
    predictions = predictions[0]
    boxes = predictions[:, :4]
    scores = predictions[:, 4:5] * predictions[:, 5:]

    boxes_xyxy = np.ones_like(boxes)
    boxes_xyxy[:, 0] = boxes[:, 0] - boxes[:, 2] / 2
    boxes_xyxy[:, 1] = boxes[:, 1] - boxes[:, 3] / 2
    boxes_xyxy[:, 2] = boxes[:, 0] + boxes[:, 2] / 2
    boxes_xyxy[:, 3] = boxes[:, 1] + boxes[:, 3] / 2

    cls_inds = scores.argmax(1)
    scores = scores[np.arange(len(cls_inds)), cls_inds]

    indices = cv2.dnn.NMSBoxes(
        boxes_xyxy, scores, score_threshold=0.4, nms_threshold=0.4
    )

    detections = np.zeros((20, 6), np.float32)
    for i, (bbox, confidence, class_id) in enumerate(
        zip(boxes_xyxy[indices], scores[indices], cls_inds[indices])
    ):
        if i == 20:
            break

        detections[i] = [
            class_id,
            confidence,
            bbox[1] / height,
            bbox[0] / width,
            bbox[3] / height,
            bbox[2] / width,
        ]

    return detections


### ONNX Utilities


def get_ort_providers(
    force_cpu: bool = False,
    device: str | None = "AUTO",
    requires_fp16: bool = False,
) -> tuple[list[str], list[dict[str, Any]]]:
    if force_cpu:
        return (
            ["CPUExecutionProvider"],
            [
                {
                    "enable_cpu_mem_arena": False,
                }
            ],
        )

    providers = []
    options = []

    for provider in ort.get_available_providers():
        if provider == "CUDAExecutionProvider":
            device_id = 0 if (not device or not device.isdigit()) else int(device)
            providers.append(provider)
            options.append(
                {
                    "arena_extend_strategy": "kSameAsRequested",
                    "use_ep_level_unified_stream": True,
                    "device_id": device_id,
                }
            )
        elif provider == "TensorrtExecutionProvider":
            # TensorrtExecutionProvider uses too much memory without options to control it
            # so it is not enabled by default
            if device == "Tensorrt":
                os.makedirs(
                    os.path.join(MODEL_CACHE_DIR, "tensorrt/ort/trt-engines"),
                    exist_ok=True,
                )
                device_id = 0 if not device.isdigit() else int(device)
                providers.append(provider)
                options.append(
                    {
                        "device_id": device_id,
                        "trt_fp16_enable": requires_fp16
                        and os.environ.get("USE_FP_16", "True") != "False",
                        "trt_timing_cache_enable": True,
                        "trt_engine_cache_enable": True,
                        "trt_timing_cache_path": os.path.join(
                            MODEL_CACHE_DIR, "tensorrt/ort"
                        ),
                        "trt_engine_cache_path": os.path.join(
                            MODEL_CACHE_DIR, "tensorrt/ort/trt-engines"
                        ),
                    }
                )
            else:
                continue
        elif provider == "OpenVINOExecutionProvider":
            # OpenVINO is used directly
            if device == "OpenVINO":
                os.makedirs(
                    os.path.join(MODEL_CACHE_DIR, "openvino/ort"), exist_ok=True
                )
                providers.append(provider)
                options.append(
                    {
                        "cache_dir": os.path.join(MODEL_CACHE_DIR, "openvino/ort"),
                        "device_type": device,
                    }
                )
        elif provider == "MIGraphXExecutionProvider":
            migraphx_cache_dir = os.path.join(MODEL_CACHE_DIR, "migraphx")
            os.makedirs(migraphx_cache_dir, exist_ok=True)

            providers.append(provider)
            options.append(
                {
                    "migraphx_model_cache_dir": migraphx_cache_dir,
                }
            )
        elif provider == "CPUExecutionProvider":
            providers.append(provider)
            options.append(
                {
                    "enable_cpu_mem_arena": False,
                }
            )
        elif provider == "AzureExecutionProvider":
            # Skip Azure provider - not typically available on local hardware
            # and prevents fallback to OpenVINO when it's the first provider
            continue
        else:
            providers.append(provider)
            options.append({})

    return (providers, options)
