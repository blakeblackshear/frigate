"""DEEPX NPU detector running compiled .dxnn models via the DX-RT runtime."""

import glob
import logging
import os
from enum import Enum
from typing import Literal

import cv2
import numpy as np
from pydantic import ConfigDict, Field, field_validator, model_validator

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum
from frigate.util.model import post_process_yolo

logger = logging.getLogger(__name__)

DETECTOR_KEY = "deepx"

DXNN_DEVICES_ENV = "DXNN_DEVICES"

# Stands in for "let Frigate pick the devices". A plain empty string would be
# written back to the config as a deletion, so the no-op needs a real value.
DEVICE_IDS_AUTO = "auto"


class DeepxModelTypeEnum(str, Enum):
    """The subset of Frigate's model types the DEEPX decoders can read.

    Frigate keeps `model_type` on the root `model` block and ignores a nested
    one, so it is not selectable per detector in the config UI, and an
    omitted value silently defaults to `ssd`. Repeating the supported values
    here as a detector option makes the choice visible in the form; the
    detector writes it back onto the merged model config at startup so the
    rest of Frigate agrees with the decoder.
    """

    # PPU-compiled models still use yolo-generic; the `ppu` option is what
    # selects the decode path, since there is no PPU-specific model type.
    yologeneric = ModelTypeEnum.yologeneric.value
    ssd = ModelTypeEnum.ssd.value
    damoyolo = ModelTypeEnum.damoyolo.value


class ModelFormatEnum(str, Enum):
    """How a .dxnn file's output is decoded.

    DX-COM preserves the detection head of the source model, so the exact
    layout has to be told apart to read it. Values are grouped by which
    `model_type` they apply to; a model_validator on DeepxDetectorConfig
    enforces that a given value is only used with its matching type.
    """

    # "no explicit layout", and the default. model_type=yolo-generic infers
    # the layout from the output shape; model_type=damo-yolo takes no layout
    # at all. This is a real enum member rather than None so the config form
    # always round-trips a value -- a null is written back as a deletion.
    auto = "auto"
    # model_type=yolo-generic: which detection-head tensor layout the .dxnn
    # was compiled with.
    anchor = "anchor"
    anchor_free = "anchor_free"
    nms_in_head = "nms_in_head"


# Anchor-based heads. Raw output is (N, 5+C) with a separate objectness column,
# and the box columns hold sigmoid activations that must be rescaled against the
# grid cell and anchor that produced them.
ANCHOR_FORMATS = frozenset(
    {
        ModelFormatEnum.anchor,
    }
)

# Anchor-free heads. Raw output is (4+C, N) channel-major with no objectness
# column, and the box columns are already in input pixels.
ANCHOR_FREE_FORMATS = frozenset(
    {
        ModelFormatEnum.anchor_free,
    }
)

# Heads that run NMS on-device and emit final boxes as (N, 6) corner records.
# DX-COM cannot compile these with PPU support.
NMS_IN_HEAD_FORMATS = frozenset(
    {
        ModelFormatEnum.nms_in_head,
    }
)

# Anchor table for anchor-based PPU models, keyed by stride.
PPU_ANCHORS = {
    8: np.array([[10, 13], [16, 30], [33, 23]], dtype=np.float32),
    16: np.array([[30, 61], [62, 45], [59, 119]], dtype=np.float32),
    32: np.array([[116, 90], [156, 198], [373, 326]], dtype=np.float32),
}
PPU_STRIDES = np.array([8, 16, 32], dtype=np.float32)

# Byte layout of the fixed-width detection record the PPU emits.
PPU_RECORD_SIZE = 32
PPU_BOX_BYTES = (0, 16)
PPU_GRID_BYTES = (16, 20)
PPU_SCORE_BYTES = (20, 24)
PPU_LABEL_BYTES = (24, 28)


# DAMO-YOLO's ZeroHead is anchor-free at these three strides regardless of
# size (TinyNAS-L20T/S/M/L differ only in backbone depth/width).
DAMOYOLO_STRIDES = (8, 16, 32)


def detect_device_count() -> int:
    """Count the NPU devices visible to this process.

    Falls back from the DX-RT API to a scan of the passed-through device
    nodes, then to a single device.
    """
    try:
        from dx_engine import get_device_count

        count = get_device_count()
    except (ImportError, RuntimeError) as err:
        logger.debug("Could not query DX-RT for a device count: %s", err)
    else:
        if count > 0:
            return count

    devices = glob.glob("/dev/dxrt*")

    return len(devices) if devices else 1


def parse_device_ids(value: str) -> list[int]:
    """Parse a comma-separated list of NPU device indices.

    The `auto` sentinel and an empty value both mean "nothing was picked",
    which leaves device selection to `resolve_devices`.
    """
    if value.strip().lower() == DEVICE_IDS_AUTO:
        return []

    return [int(part) for part in value.split(",") if part.strip()]


def resolve_devices(configured: str) -> list[int]:
    """Resolve which NPU device indices this detector should bind to."""
    if configured:
        # already validated by DeepxDetectorConfig
        devices = parse_device_ids(configured)

        if devices:
            return devices

    env_value = os.environ.get(DXNN_DEVICES_ENV)

    if env_value:
        try:
            devices = parse_device_ids(env_value)
        except ValueError:
            logger.warning(
                "Ignoring unparsable %s=%s, detecting devices instead",
                DXNN_DEVICES_ENV,
                env_value,
            )
        else:
            if devices:
                return devices

    return list(range(detect_device_count()))


def reinterpret(tensor: np.ndarray, byte_range: tuple[int, int], dtype) -> np.ndarray:
    """Read a byte column range of a uint8 PPU tensor as `dtype`.

    A column slice is not contiguous, and numpy will not reinterpret
    non-contiguous memory as a differently sized dtype, so it is copied first.
    """
    lo, hi = byte_range
    return np.ascontiguousarray(tensor[:, lo:hi]).view(dtype)


def ppu_records(outputs: list[np.ndarray]) -> np.ndarray | None:
    """Return the fixed-width record array a PPU model emits, or None."""
    if not outputs or outputs[0].ndim < 2:
        return None

    # drop the batch dimension, leaving one uint8 record per candidate
    records = outputs[0][0]

    if (
        records.ndim != 2
        or records.shape[1] != PPU_RECORD_SIZE
        or records.shape[0] == 0
    ):
        logger.debug("Unexpected PPU output shape %s, skipping frame", records.shape)
        return None

    return records


def _softmax(x: np.ndarray) -> np.ndarray:
    """Numerically stable softmax over the last axis."""
    shifted = x - np.max(x, axis=-1, keepdims=True)
    exp = np.exp(shifted)
    return exp / np.sum(exp, axis=-1, keepdims=True)


def _split_box_and_class_outputs(
    outputs: list[np.ndarray],
) -> tuple[np.ndarray, np.ndarray] | None:
    """Split a 2-tensor raw output into (box tensor, class tensor) by shape.

    Used for model types where DX-COM's raw output tensor order isn't
    confirmed. Whichever tensor's shape reads as box-like -- (..., 4), or
    (..., 4, bins) for a per-side distribution -- is treated as boxes; the
    other is class scores. Returns None if that can't be told apart, which
    a class-score tensor with exactly 4 classes would also trigger.
    """
    if len(outputs) != 2:
        return None

    def is_box_shaped(t: np.ndarray) -> bool:
        return (t.ndim == 3 and t.shape[-1] == 4) or (t.ndim == 4 and t.shape[-2] == 4)

    first, second = outputs[0], outputs[1]
    first_is_box, second_is_box = is_box_shaped(first), is_box_shaped(second)

    if first_is_box and not second_is_box:
        return first, second
    if second_is_box and not first_is_box:
        return second, first

    return None


def _shapes(outputs: list[np.ndarray]) -> list[tuple[int, ...]]:
    """Output shapes, for diagnosing a decode path that can't read them."""
    return [np.shape(output) for output in outputs]


def fill_detections(
    x_min: np.ndarray,
    y_min: np.ndarray,
    x_max: np.ndarray,
    y_max: np.ndarray,
    scores: np.ndarray,
    labels: np.ndarray,
    width: int,
    height: int,
    order: np.ndarray,
) -> np.ndarray:
    """Normalize the surviving boxes into Frigate's (20, 6) detection array."""
    detections = np.zeros((20, 6), np.float32)

    for i, idx in enumerate(order[:20]):
        detections[i] = [
            labels[idx],
            scores[idx],
            np.clip(y_min[idx] / height, 0, 1),
            np.clip(x_min[idx] / width, 0, 1),
            np.clip(y_max[idx] / height, 0, 1),
            np.clip(x_max[idx] / width, 0, 1),
        ]

    return detections


def run_nms(
    x_min: np.ndarray,
    y_min: np.ndarray,
    box_w: np.ndarray,
    box_h: np.ndarray,
    scores: np.ndarray,
    score_threshold: float,
    nms_threshold: float,
) -> np.ndarray:
    """Return the indices surviving NMS, in descending score order."""
    if logger.isEnabledFor(logging.DEBUG):
        # Separates "the decode produced nothing" from "it produced boxes
        # whose scores all fell under the threshold", which look identical
        # from the empty detection array alone.
        logger.debug(
            "NMS input: %d boxes, best score %.4f, %d over threshold %.2f",
            len(scores),
            float(scores.max()) if len(scores) else 0.0,
            int((scores >= score_threshold).sum()),
            score_threshold,
        )

    boxes_xywh = np.column_stack([x_min, y_min, box_w, box_h])
    indices = cv2.dnn.NMSBoxes(
        boxes_xywh.tolist(), scores.tolist(), score_threshold, nms_threshold
    )

    if len(indices) == 0:
        return np.empty(0, dtype=np.int32)

    return np.array(indices).reshape(-1)


def decode_ppu_anchor(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
    nms_threshold: float,
) -> np.ndarray:
    """Decode PPU output from an anchor-based head.

    Models compiled with DEEPX's Post-Processing Unit perform candidate
    selection on the NPU and emit one fixed-width record per surviving
    detection, so only the anchor decode and NMS are left for the host. This
    is cheaper than decoding raw feature maps because every sub-threshold
    anchor has already been discarded.

    Returns detections in Frigate's (20, 6) format of
    [class_id, score, y_min, x_min, y_max, x_max] with normalized coordinates.
    """
    records = ppu_records(outputs)

    if records is None:
        return np.zeros((20, 6), np.float32)

    boxes = reinterpret(records, PPU_BOX_BYTES, np.float32).reshape(-1, 4)
    scores = reinterpret(records, PPU_SCORE_BYTES, np.float32).flatten()
    labels = reinterpret(records, PPU_LABEL_BYTES, np.uint32).flatten()

    grid = records[:, PPU_GRID_BYTES[0] : PPU_GRID_BYTES[1]]
    grid_y = grid[:, 0].astype(np.float32)
    grid_x = grid[:, 1].astype(np.float32)
    anchor_idx = grid[:, 2]
    layer_idx = grid[:, 3]

    stride = PPU_STRIDES[layer_idx]
    anchor_w = np.zeros(len(boxes), dtype=np.float32)
    anchor_h = np.zeros(len(boxes), dtype=np.float32)

    for layer_stride, anchors in PPU_ANCHORS.items():
        mask = stride == layer_stride

        if np.any(mask):
            anchor_w[mask] = anchors[anchor_idx[mask], 0]
            anchor_h[mask] = anchors[anchor_idx[mask], 1]

    # Anchor-based decode: the model emits sigmoid outputs that are rescaled
    # against the grid cell and its anchor to recover pixel geometry.
    center_x = (boxes[:, 0] * 2.0 - 0.5 + grid_x) * stride
    center_y = (boxes[:, 1] * 2.0 - 0.5 + grid_y) * stride
    box_w = (boxes[:, 2] ** 2 * 4.0) * anchor_w
    box_h = (boxes[:, 3] ** 2 * 4.0) * anchor_h

    x_min = center_x - box_w * 0.5
    y_min = center_y - box_h * 0.5

    order = run_nms(x_min, y_min, box_w, box_h, scores, score_threshold, nms_threshold)

    return fill_detections(
        x_min,
        y_min,
        x_min + box_w,
        y_min + box_h,
        scores,
        labels,
        width,
        height,
        order,
    )


def decode_ppu_anchor_free(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
    nms_threshold: float,
) -> np.ndarray:
    """Decode PPU output from an anchor-free head.

    These heads have no anchors and no objectness, so the PPU writes the box
    directly as (center_x, center_y, width, height) in input pixels. The grid
    columns an anchor-based record carries are unused here, and applying the
    anchor formula to them is what produces boxes hundreds of thousands of
    pixels wide.
    """
    records = ppu_records(outputs)

    if records is None:
        return np.zeros((20, 6), np.float32)

    boxes = reinterpret(records, PPU_BOX_BYTES, np.float32).reshape(-1, 4)
    scores = reinterpret(records, PPU_SCORE_BYTES, np.float32).flatten()
    labels = reinterpret(records, PPU_LABEL_BYTES, np.uint32).flatten()

    box_w = boxes[:, 2]
    box_h = boxes[:, 3]
    x_min = boxes[:, 0] - box_w * 0.5
    y_min = boxes[:, 1] - box_h * 0.5

    order = run_nms(x_min, y_min, box_w, box_h, scores, score_threshold, nms_threshold)

    return fill_detections(
        x_min,
        y_min,
        x_min + box_w,
        y_min + box_h,
        scores,
        labels,
        width,
        height,
        order,
    )


def decode_raw_anchor(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
    nms_threshold: float,
) -> np.ndarray:
    """Decode raw output from an anchor-based head.

    The exported head emits (N, 5+C) rows of
    [center_x, center_y, width, height, objectness, class scores...] already in
    input pixels. Confidence is objectness times the best class score, which is
    what separates this layout from the anchor-free one: reading column 4 as a
    class score there would treat objectness as a class.
    """
    tensor = outputs[0]

    if tensor.ndim < 2 or tensor.shape[-1] == 0:
        return np.zeros((20, 6), np.float32)

    # squeeze would collapse the row axis too when a single candidate is
    # returned, so fold every leading axis into rows instead
    predictions = tensor.reshape(-1, tensor.shape[-1])

    if predictions.shape[0] == 0:
        return np.zeros((20, 6), np.float32)

    objectness = predictions[:, 4]
    class_scores = predictions[:, 5:]
    labels = np.argmax(class_scores, axis=1)
    scores = objectness * class_scores[np.arange(len(labels)), labels]

    box_w = predictions[:, 2]
    box_h = predictions[:, 3]
    x_min = predictions[:, 0] - box_w * 0.5
    y_min = predictions[:, 1] - box_h * 0.5

    order = run_nms(x_min, y_min, box_w, box_h, scores, score_threshold, nms_threshold)

    return fill_detections(
        x_min,
        y_min,
        x_min + box_w,
        y_min + box_h,
        scores,
        labels,
        width,
        height,
        order,
    )


def decode_raw_anchor_free(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
    nms_threshold: float,
) -> np.ndarray:
    """Decode raw output from an anchor-free head, or an unconfirmed layout.

    The exported head emits a single tensor with no objectness column,
    (4+C, N) channel-major or already transposed to (N, 4+C), and box columns
    already in input pixels as (center_x, center_y, width, height). This is
    also what `model_format: auto` falls back to: with only one output
    tensor there is no objectness column to tell an anchor-based head from
    an anchor-free one apart, so every column past the box is read as a
    class score, which is only correct for an anchor-free head -- matching
    `auto` being "only reliable for anchor-free heads" per its config
    description.
    """
    predictions = outputs[0]

    # Drop the batch axis without a blind squeeze, which would also collapse
    # the box-count axis on the single-candidate frame case. Fold every
    # leading axis into rows instead.
    if predictions.ndim == 3 and predictions.shape[0] == 1:
        predictions = predictions[0]

    if predictions.ndim != 2:
        return np.zeros((20, 6), np.float32)

    # DX-COM may export channel-major (4+C, N); transpose to (N, 4+C) so
    # rows are boxes, matching every other decoder in this file.
    if predictions.shape[0] < predictions.shape[1]:
        predictions = predictions.T

    if predictions.shape[0] == 0 or predictions.shape[1] <= 4:
        return np.zeros((20, 6), np.float32)

    class_scores = predictions[:, 4:]
    labels = np.argmax(class_scores, axis=1)
    scores = class_scores[np.arange(len(labels)), labels]

    box_w = predictions[:, 2]
    box_h = predictions[:, 3]
    x_min = predictions[:, 0] - box_w * 0.5
    y_min = predictions[:, 1] - box_h * 0.5

    order = run_nms(x_min, y_min, box_w, box_h, scores, score_threshold, nms_threshold)

    return fill_detections(
        x_min,
        y_min,
        x_min + box_w,
        y_min + box_h,
        scores,
        labels,
        width,
        height,
        order,
    )


def decode_raw_nms_in_head(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
) -> np.ndarray:
    """Decode raw output from a head that already ran NMS.

    These heads emit (N, 6) rows of [x_min, y_min, x_max, y_max, score, class]
    in input pixels, sorted by score. Running NMS again would be wasted work,
    so only the score filter and normalization are applied.
    """
    tensor = outputs[0]

    if tensor.ndim < 2 or tensor.shape[-1] == 0:
        return np.zeros((20, 6), np.float32)

    # squeeze would collapse the row axis too when a single candidate is
    # returned, so fold every leading axis into rows instead
    predictions = tensor.reshape(-1, tensor.shape[-1])

    if predictions.shape[0] == 0:
        return np.zeros((20, 6), np.float32)

    scores = predictions[:, 4]
    order = np.flatnonzero(scores >= score_threshold)

    return fill_detections(
        predictions[:, 0],
        predictions[:, 1],
        predictions[:, 2],
        predictions[:, 3],
        scores,
        predictions[:, 5].astype(np.int32),
        width,
        height,
        order,
    )


def decode_ssd_raw(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
    nms_threshold: float,
) -> np.ndarray:
    """Decode SSD output: already-decoded boxes plus per-class probabilities.

    DX-COM keeps SSD's postprocessing inside the compiled model. The .dxnn
    runs the NPU head into a small CPU subgraph that concatenates the
    per-feature-map outputs, applies softmax to the confidences, and decodes
    the prior-box regression (center variance 0.1, size variance 0.2, prior
    table baked in as initializers) all the way to corner-form boxes. That
    leaves only NMS for the host, which is what DEEPX's own ssdmv1,
    ssdmv2lite and ssdvgg16 demos do -- their postprocessor has no prior
    table, no variance constant, and no softmax.

    Expects two output tensors, order-independent: boxes shaped (1, N, 4) as
    (x_min, y_min, x_max, y_max) normalized to [0, 1], and probabilities
    shaped (1, N, num_classes + 1) with background at class 0. Background is
    dropped and surviving labels are 0-indexed, to match a labelmap with no
    background row. N is whatever the backbone produces (3000 for the
    MobileNet variants, 8732 for VGG16) and never has to be known ahead of
    time.
    """
    split = _split_box_and_class_outputs(outputs)

    if split is None:
        logger.debug(
            "Could not identify SSD box/class outputs in %d tensor(s) with "
            "shapes %s, skipping frame",
            len(outputs),
            _shapes(outputs),
        )
        return np.zeros((20, 6), np.float32)

    boxes, confidences = split

    if (
        boxes.ndim != 3
        or confidences.ndim != 3
        or boxes.shape[0] == 0
        or boxes.shape[1] == 0
    ):
        logger.debug(
            "Unexpected SSD output rank: boxes %s, classes %s, skipping frame",
            boxes.shape,
            confidences.shape,
        )
        return np.zeros((20, 6), np.float32)

    boxes = boxes[0]
    confidences = confidences[0]

    if boxes.shape[0] != confidences.shape[0]:
        logger.debug(
            "SSD box count %d does not match class count %d, skipping frame",
            boxes.shape[0],
            confidences.shape[0],
        )
        return np.zeros((20, 6), np.float32)

    # the model already softmaxed these; drop background (class 0) and
    # relabel 0-indexed to match a labelmap with no background row
    scores = confidences[:, 1:]
    labels = np.argmax(scores, axis=1)
    scores = scores[np.arange(len(labels)), labels]

    # normalized corner form -> input pixels, which is what NMS and
    # fill_detections work in
    x_min = boxes[:, 0] * width
    y_min = boxes[:, 1] * height
    x_max = boxes[:, 2] * width
    y_max = boxes[:, 3] * height

    order = run_nms(
        x_min,
        y_min,
        x_max - x_min,
        y_max - y_min,
        scores,
        score_threshold,
        nms_threshold,
    )

    return fill_detections(
        x_min, y_min, x_max, y_max, scores, labels, width, height, order
    )


def _dfl_integral(distribution: np.ndarray) -> np.ndarray:
    """Reduce a DFL distribution to an expected distance via weighted sum.

    Ported from tinyvision/DAMO-YOLO's Integral module (Apache-2.0): each of
    the 4 box sides is predicted as a probability distribution over
    `reg_max + 1` discrete distance bins rather than a single regressed
    value; this recovers one scalar distance per side, in stride units.
    """
    reg_max = distribution.shape[-1] - 1
    project = np.arange(reg_max + 1, dtype=np.float32)
    return distribution @ project


def _damoyolo_center_priors(
    width: int, height: int, strides: tuple[int, ...]
) -> np.ndarray:
    """One (center_x, center_y, stride) row per grid cell across all scales,
    in pixel space at the model's own input resolution.

    Ported from tinyvision/DAMO-YOLO's
    ZeroHead.get_single_level_center_priors (Apache-2.0).
    """
    rows = []

    for stride in strides:
        grid_h, grid_w = height // stride, width // stride
        row_idx, col_idx = np.mgrid[0:grid_h, 0:grid_w]
        centers_x = col_idx.ravel().astype(np.float32) * stride
        centers_y = row_idx.ravel().astype(np.float32) * stride
        strides_col = np.full(centers_x.shape, stride, dtype=np.float32)
        rows.append(np.stack([centers_x, centers_y, strides_col], axis=1))

    return np.concatenate(rows, axis=0)


def decode_damoyolo_raw(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
    nms_threshold: float,
    strides: tuple[int, ...] = DAMOYOLO_STRIDES,
) -> np.ndarray:
    """Decode DAMO-YOLO's raw output: sigmoid class scores + a DFL box head.

    Ported from tinyvision/DAMO-YOLO's ZeroHead (Apache-2.0). DAMO-YOLO is
    anchor-free like YOLOv8 and newer, but unlike them its box regression is
    a per-side Distribution Focal Loss histogram rather than a value already
    in pixels, so it needs its own decode instead of reusing
    decode_raw_anchor. Not yet verified against a real compiled model --
    see the two shape branches below for what DX-COM's export is assumed to
    produce, and adjust if a real .dxnn's shapes don't match either one.

    Expects two output tensors, order-independent: class scores shaped
    (1, N, num_classes), already sigmoid-activated, and a box output that is
    either (1, N, 4, reg_max + 1) -- a raw DFL distribution per side, decoded
    here via softmax + integral + stride-scaled distance-to-box -- or
    already (1, N, 4), in case DX-COM's export folds that whole decode in
    (the reference only ever produces a plain 4-wide box tensor as the
    *result* of that decode, so this shape is treated as final
    (x_min, y_min, x_max, y_max) pixel coordinates, not as a second
    distance representation).
    """
    split = _split_box_and_class_outputs(outputs)

    if split is None:
        logger.debug(
            "Could not identify DAMO-YOLO box/class outputs in %d tensor(s) with "
            "shapes %s, skipping frame",
            len(outputs),
            _shapes(outputs),
        )
        return np.zeros((20, 6), np.float32)

    box_output, cls_scores = split

    if cls_scores.ndim != 3 or cls_scores.shape[0] == 0 or cls_scores.shape[1] == 0:
        return np.zeros((20, 6), np.float32)

    cls_scores = cls_scores[0]
    num_priors = cls_scores.shape[0]

    if box_output.ndim == 4:
        # raw per-side DFL distribution: softmax the bins, reduce to an
        # expected distance (in stride units), then scale by each prior's
        # own stride and apply it against that prior's center
        distances = _dfl_integral(_softmax(box_output[0]))

        if distances.shape[0] != num_priors:
            logger.debug(
                "DAMO-YOLO box count %d does not match class count %d, skipping frame",
                distances.shape[0],
                num_priors,
            )
            return np.zeros((20, 6), np.float32)

        priors = _damoyolo_center_priors(width, height, strides)

        if priors.shape[0] != num_priors:
            logger.debug(
                "DAMO-YOLO prior count %d does not match model output %d, "
                "skipping frame",
                priors.shape[0],
                num_priors,
            )
            return np.zeros((20, 6), np.float32)

        center_x, center_y, stride = priors[:, 0], priors[:, 1], priors[:, 2]
        distances_px = distances * stride[:, None]

        x_min = center_x - distances_px[:, 0]
        y_min = center_y - distances_px[:, 1]
        x_max = center_x + distances_px[:, 2]
        y_max = center_y + distances_px[:, 3]
    elif box_output.ndim == 3 and box_output.shape[-1] == 4:
        boxes = box_output[0]

        if boxes.shape[0] != num_priors:
            logger.debug(
                "DAMO-YOLO box count %d does not match class count %d, skipping frame",
                boxes.shape[0],
                num_priors,
            )
            return np.zeros((20, 6), np.float32)

        x_min, y_min, x_max, y_max = (
            boxes[:, 0],
            boxes[:, 1],
            boxes[:, 2],
            boxes[:, 3],
        )
    else:
        logger.debug(
            "Unexpected DAMO-YOLO box output shape %s, skipping frame",
            box_output.shape,
        )
        return np.zeros((20, 6), np.float32)

    labels = np.argmax(cls_scores, axis=1)
    scores = cls_scores[np.arange(num_priors), labels]

    order = run_nms(
        x_min,
        y_min,
        x_max - x_min,
        y_max - y_min,
        scores,
        score_threshold,
        nms_threshold,
    )

    return fill_detections(
        x_min, y_min, x_max, y_max, scores, labels, width, height, order
    )


class DeepxDetectorConfig(BaseDetectorConfig):
    """DEEPX NPU detector running .dxnn models via the DX-RT runtime."""

    model_config = ConfigDict(title="DEEPX NPU")

    type: Literal[DETECTOR_KEY]
    device_ids: str = Field(
        default=DEVICE_IDS_AUTO,
        title="DEEPX device indices",
        description="Comma-separated NPU device indices this detector should "
        'bind to, e.g. "0,1". Leave as "auto" to detect them from the '
        "DXNN_DEVICES environment variable, then the DX-RT device count, then "
        "a scan of /dev/dxrt*.",
    )
    model_type: DeepxModelTypeEnum = Field(
        default=DeepxModelTypeEnum.yologeneric,
        title="Detection model architecture",
        description="Which decoder reads the model's output. Overrides "
        "model.model_type for this detector, whose default of ssd would "
        "otherwise apply whenever the root model block leaves it unset.",
    )
    ppu: bool = Field(
        default=False,
        title="PPU-compiled model",
        description="Set to true when the model was compiled with DEEPX's "
        "Post-Processing Unit support, which moves candidate selection onto "
        "the NPU and changes the output format. Only supported for "
        "model_type yolo-generic.",
    )
    model_format: ModelFormatEnum = Field(
        default=ModelFormatEnum.auto,
        title="Detection head layout the model was compiled from",
        description="Selects how the model's output is decoded. Only used "
        'for model_type yolo-generic: leave as "auto" to infer the layout '
        "from the output shape, which cannot tell an anchor-based head from "
        "an anchor-free one and is only reliable for anchor-free heads. "
        "Required when ppu is true, since a PPU record's layout is identical "
        "for every yolo-generic variant and cannot be inferred. ssd and "
        "damo-yolo each read one fixed layout and take no value here.",
    )
    score_threshold: float = Field(
        default=0.25,
        title="Score threshold used when decoding detector output",
    )
    nms_threshold: float = Field(
        default=0.45,
        title="NMS IoU threshold used when decoding detector output",
    )

    @field_validator("device_ids", mode="before")
    @classmethod
    def coerce_device_ids(cls, value):
        """Accept the yaml list form as well as the comma-separated string
        the config form writes, since a bare list is the natural thing to
        hand-write. A blank entry folds back to the auto sentinel."""
        if isinstance(value, (list, tuple)):
            value = ",".join(str(item) for item in value)
        elif isinstance(value, int) and not isinstance(value, bool):
            value = str(value)

        if value is None or (isinstance(value, str) and not value.strip()):
            return DEVICE_IDS_AUTO

        return value

    @field_validator("device_ids")
    @classmethod
    def validate_device_ids(cls, value: str) -> str:
        """Reject a device list that can't be parsed, so the error surfaces at
        config load rather than when the detector process starts."""
        try:
            parse_device_ids(value)
        except ValueError:
            raise ValueError(
                f'device_ids "{value}" is not a comma-separated list of NPU '
                f'device indices, e.g. "0,1", or "{DEVICE_IDS_AUTO}".'
            ) from None

        return value

    @field_validator("model_format", mode="before")
    @classmethod
    def coerce_model_format(cls, value):
        """A blank or absent entry means "no explicit layout"."""
        if value is None or (isinstance(value, str) and not value.strip()):
            return ModelFormatEnum.auto

        return value

    @model_validator(mode="after")
    def validate_ppu_is_supported(self):
        """Reject a PPU pairing DX-COM cannot produce, or that has no
        confirmed PPU record layout yet."""
        if not self.ppu:
            return self

        if self.model_format in NMS_IN_HEAD_FORMATS:
            raise ValueError(
                f"model_format '{self.model_format.value}' runs NMS in the "
                "detection head and cannot be compiled with PPU support by "
                "DX-COM. Set ppu to false."
            )

        if self.model_type is DeepxModelTypeEnum.damoyolo:
            raise ValueError(
                'PPU is not yet supported for model_type "damo-yolo". Set ppu to false.'
            )

        return self

    @model_validator(mode="after")
    def validate_ppu_requires_model_format(self):
        """Reject an unset model_format when ppu is enabled.

        A PPU record is the same fixed-width layout for every yolo-generic
        variant, so unlike the raw output path there is no shape to infer
        the layout from. Leaving model_format unset here used to silently
        default to the anchor-based decoder, which corrupts detections from
        anchor-free PPU models instead of failing loudly.
        """
        if self.ppu and self.model_format is ModelFormatEnum.auto:
            raise ValueError(
                "model_format must be set when ppu is true. The PPU output "
                "layout can't be inferred, and guessing wrong silently "
                "corrupts detections."
            )

        return self

    @model_validator(mode="after")
    def validate_model_format_matches_model_type(self):
        """Reject a model_format on a model_type that has no layout to pick.

        Only yolo-generic has variants the decoder can't tell apart. SSD and
        DAMO-YOLO each read one fixed output layout, so any value other than
        the sentinel is a config mistake rather than a choice."""
        if self.model_type is DeepxModelTypeEnum.yologeneric:
            return self

        if self.model_format is not ModelFormatEnum.auto:
            raise ValueError(
                "model_format is not used for model_type "
                f"{self.model_type.value} -- its output layout is fixed. "
                'Leave it as "auto".'
            )

        return self


class Deepx(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, config: DeepxDetectorConfig):
        try:
            from dx_engine import InferenceEngine, InferenceOption
        except ImportError as err:
            raise ImportError(
                "The DX-RT runtime is not available. Check that the DEEPX "
                "kernel driver is loaded on the Docker host and that "
                "/dev/dxrt* is passed through to this container."
            ) from err

        super().__init__(config)

        # Frigate ignores a nested `model` block, so model.model_type carries
        # the root value -- `ssd` whenever it was left unset. The detector's
        # own model_type is the one the user actually picked, so it wins, and
        # is written back for everything downstream that reads the model
        # config (the events table, /api/config).
        self.model_type = ModelTypeEnum(config.model_type.value)
        config.model.model_type = self.model_type

        model_path = config.model.path

        if not model_path or not os.path.isfile(model_path):
            raise FileNotFoundError(
                f"DEEPX model '{model_path}' was not found. Compile a model with "
                "DX-COM or download one from the DEEPX ModelZoo, then point "
                "model.path at the .dxnn file."
            )

        devices = resolve_devices(config.device_ids)
        logger.info("Loading DEEPX model %s on device(s) %s", model_path, devices)

        options = InferenceOption()
        options.devices = devices
        options.bound_option = InferenceOption.BOUND_OPTION.NPU_ALL

        self.session = InferenceEngine(str(model_path), options)
        self.ppu = config.ppu
        self.model_format = config.model_format
        self.score_threshold = config.score_threshold
        self.nms_threshold = config.nms_threshold

        self.logged_layout = False

        logger.info(
            "DEEPX decoding %s output for model_type %s as %s",
            "PPU" if self.ppu else "raw",
            self.model_type.value,
            "auto-detected"
            if self.model_format is ModelFormatEnum.auto
            else self.model_format.value,
        )

    def decode(self, outputs: list[np.ndarray]) -> np.ndarray:
        """Decode raw or PPU output according to the configured model type
        and detection head layout."""
        if self.model_type == ModelTypeEnum.ssd:
            return decode_ssd_raw(
                outputs,
                self.width,
                self.height,
                self.score_threshold,
                self.nms_threshold,
            )

        if self.model_type == ModelTypeEnum.damoyolo:
            return decode_damoyolo_raw(
                outputs,
                self.width,
                self.height,
                self.score_threshold,
                self.nms_threshold,
            )

        # model_type is yolo-generic from here on
        if self.ppu:
            # Config validation guarantees model_format is set to an anchor
            # or anchor-free format whenever ppu is true, since PPU records
            # give no other way to tell the two apart.
            if self.model_format in ANCHOR_FREE_FORMATS:
                return decode_ppu_anchor_free(
                    outputs,
                    self.width,
                    self.height,
                    self.score_threshold,
                    self.nms_threshold,
                )

            return decode_ppu_anchor(
                outputs,
                self.width,
                self.height,
                self.score_threshold,
                self.nms_threshold,
            )

        if self.model_format in NMS_IN_HEAD_FORMATS:
            return decode_raw_nms_in_head(
                outputs, self.width, self.height, self.score_threshold
            )

        # Only single-output anchor heads need the dedicated decoder. A
        # multi-part output is a set of raw feature maps, which the shared
        # helper already decodes with the same anchor formula.
        if self.model_format in ANCHOR_FORMATS and len(outputs) == 1:
            return decode_raw_anchor(
                outputs,
                self.width,
                self.height,
                self.score_threshold,
                self.nms_threshold,
            )

        # `auto` (the default) and an explicit `anchor_free` both read a
        # single tensor with no objectness column. Routing these through the
        # dedicated decoder keeps them honoring this detector's own
        # score_threshold and nms_threshold
        if len(outputs) == 1 and (
            self.model_format in ANCHOR_FREE_FORMATS
            or self.model_format is ModelFormatEnum.auto
        ):
            return decode_raw_anchor_free(
                outputs,
                self.width,
                self.height,
                self.score_threshold,
                self.nms_threshold,
            )

        return post_process_yolo(outputs, self.width, self.height)

    def detect_raw(self, tensor_input):
        """Run inference and decode the DEEPX model output."""
        outputs = self.session.run([tensor_input])

        if not isinstance(outputs, list):
            outputs = [outputs]

        detections = self.decode(outputs)

        if not self.logged_layout:
            self.logged_layout = True
            self.log_layout(tensor_input, outputs)

        if logger.isEnabledFor(logging.DEBUG):
            logger.debug(
                "DEEPX decoded %d detections, best score %.4f",
                int((detections[:, 1] > 0).sum()),
                float(detections[:, 1].max()),
            )

        return detections

    def log_layout(self, tensor_input, outputs: list[np.ndarray]) -> None:
        """Log the model's real input and output layout, once per start.

        Every decode path is a guess about the layout DX-COM compiled the
        detection head into, and a wrong guess returns an empty detection
        array rather than failing. These shapes and value ranges are the
        first thing needed to tell those apart, so they go out at info
        level: waiting to reproduce them with debug logging enabled costs a
        restart, and this is one line per tensor per detector start.
        """
        tensors = [("input", tensor_input)]
        tensors += [(f"output[{i}]", out) for i, out in enumerate(outputs)]

        for name, tensor in tensors:
            array = np.asarray(tensor)
            logger.info(
                "DEEPX %s: shape=%s dtype=%s min=%s max=%s",
                name,
                array.shape,
                array.dtype,
                array.min() if array.size else "n/a",
                array.max() if array.size else "n/a",
            )
