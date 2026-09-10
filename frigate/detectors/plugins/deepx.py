"""DEEPX NPU detector running compiled .dxnn models via the DX-RT runtime."""

import logging
import os
from dataclasses import dataclass
from enum import Enum
from typing import Literal

import cv2
import numpy as np
from pydantic import ConfigDict, Field, field_validator, model_validator

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum
from frigate.util.model import post_process_yolo
from frigate.util.runtime_deps import Artifact, ArtifactKind, RuntimeManifest

logger = logging.getLogger(__name__)

DETECTOR_KEY = "deepx"

# Installed at first start; DEEPX's PyPI wheels match the libdxrt-bin build.
DXRT_VERSION = "3.4.0"

# Where the host dxrtd accepts clients. Its abstract socket is unreachable
# from a container, and a mounted socket file pins a stale inode after a
# daemon restart, so the directory is what gets mounted.
DXRT_IPC_ENDPOINT_ENV = "DXRT_DYNAMIC_IPC_ENDPOINT"
DXRT_IPC_SOCKET = "/run/dxrt/dxrt_dynamic_ipc.sock"

# Pre-NMS filter, matching Frigate's shared YOLO decoder; per-object
# min_score and threshold are applied by Frigate afterwards.
SCORE_THRESHOLD = 0.4
NMS_THRESHOLD = 0.4

SUPPORTED_MODEL_TYPES = (ModelTypeEnum.yologeneric, ModelTypeEnum.damoyolo)

# Fixed-width record the PPU emits, DeviceBoundingBox_t in DX-RT's
# datatype.h: x, y, w, h (float32), grid_y, grid_x, box_idx, layer_idx
# (uint8), score (float32), label (uint32), 4 bytes of padding.
PPU_RECORD_SIZE = 32
PPU_BOX_BYTES = (0, 16)
PPU_GRID_BYTES = (16, 20)
PPU_SCORE_BYTES = (20, 24)
PPU_LABEL_BYTES = (24, 28)

PPU_ANCHORS_BY_SCALES = {
    2: np.array(
        [
            [[23, 27], [37, 58], [81, 82]],
            [[81, 82], [135, 169], [344, 319]],
        ],
        dtype=np.float32,
    ),
    3: np.array(
        [
            [[10, 13], [16, 30], [33, 23]],
            [[30, 61], [62, 45], [59, 119]],
            [[116, 90], [156, 198], [373, 326]],
        ],
        dtype=np.float32,
    ),
}

PPU_MAX_STRIDE = 32
# the largest scale count we have a table for; a count below this with no
# table of its own is under-evidenced rather than disproven, so it still
# gets the biggest table as a best guess
PPU_MAX_KNOWN_SCALES = max(PPU_ANCHORS_BY_SCALES)

# A nms-in-head output is (N, 6) rows of x_min, y_min, x_max, y_max, score,
# class, with N decided per frame and capped in the head (300 for the
# ModelZoo exports). A raw head has thousands of rows, which is what tells
# the two apart when a 1 or 2 class model also has 6 columns.
NMS_IN_HEAD_COLUMNS = 6
NMS_IN_HEAD_MAX_ROWS = 1000

# Frigate's shared multipart decoder reads exactly three NCHW feature maps
# with 3 anchors x (5 + 80) channels each.
MULTIPART_OUTPUTS = 3
MULTIPART_CLASSES = 80
MULTIPART_CHANNELS = 3 * (5 + MULTIPART_CLASSES)


# PyPI URLs carry a per-file digest, so a version bump rewrites them whole.
DEEPX_MANIFEST = RuntimeManifest(
    name=DETECTOR_KEY,
    version=DXRT_VERSION,
    artifacts=(
        Artifact(
            url=(
                "https://files.pythonhosted.org/packages/de/45/"
                "1ca593e1c4ed868618658e07adeffc1fb44b92655d1ba48a6c76942616ee/"
                "dx_engine-3.4.0-cp311-cp311-manylinux_2_27_aarch64.whl"
            ),
            sha256="ec4188e0a598a164bc04312482f70159be1a3d888284dcf52746054138101ec7",
            kind=ArtifactKind.wheel,
            machines=("aarch64",),
        ),
        Artifact(
            url=(
                "https://files.pythonhosted.org/packages/b0/32/"
                "d52b33d5b85f7d8565e3e2d153f19db6d506cd5504339f31c6553eae06c6/"
                "dx_engine-3.4.0-cp311-cp311-manylinux_2_27_x86_64.whl"
            ),
            sha256="161fde8428fc8aea95c560d878bc68e8d1c657c18a0eb04840de4bd212f3477f",
            kind=ArtifactKind.wheel,
            machines=("x86_64",),
        ),
    ),
    import_check="dx_engine",
)


def resolve_device(configured: str) -> int:
    """Resolve the NPU index from the device half of a `deepx:...` string:
    empty, a bare index, or `PCIe:<index>` as the hardware probe writes it.
    """
    if not configured:
        return 0

    index = configured.rsplit(":", 1)[-1]

    try:
        return int(index)
    except ValueError:
        raise ValueError(
            f'"{configured}" is not an NPU index; expected a number or "PCIe:<number>"'
        ) from None


def _split_box_and_class_outputs(
    outputs: list[np.ndarray],
) -> tuple[np.ndarray, np.ndarray] | None:
    """Split a 2-tensor raw output into (box tensor, class tensor) by shape:
    the (1, N, 4) tensor is the boxes, None when ambiguous as with 4 classes."""
    if len(outputs) != 2:
        return None

    def is_box_shaped(t: np.ndarray) -> bool:
        return t.ndim == 3 and t.shape[-1] == 4

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


class YoloLayout(str, Enum):
    """How a yolo-generic .dxnn output is read; DX-COM keeps the source
    model's head, so the head decides and the model is what gets asked."""

    ppu = "ppu"  # fixed-width records from the NPU's post-processing unit
    anchor = "anchor"  # (N, 5+C) with an objectness column, pixel boxes
    anchor_free = "anchor_free"  # (N, 4+C) or (4+C, N), no objectness
    nms_in_head = "nms_in_head"  # (N, 6) final corner boxes
    multipart = "multipart"  # three NCHW feature maps


@dataclass(frozen=True)
class YoloOutput:
    """The decoder a model needs and, for single-tensor layouts, its row
    width, so the decoder can orient the tensor."""

    layout: YoloLayout
    columns: int | None = None


def class_count(labelmap: dict[int, str]) -> int:
    """Highest label id plus one, which bounds the classes even when ids
    are sparse."""
    if not labelmap:
        raise ValueError("the label map is empty; set labelmap_path")

    return max(labelmap) + 1


def _significant_dims(shape: tuple[int, ...]) -> list[int]:
    """Drop the batch and any other size-1 axis, leaving rows x columns."""
    return [int(d) for d in shape if d != 1]


def infer_yolo_layout(
    shapes: list[tuple[int, ...]],
    num_classes: int,
    ppu: bool,
    dynamic_output: bool,
) -> YoloOutput:
    """Pick the decoder from the output shapes the runtime reports. The
    label map's class count tells a 4+C anchor-free head from a 5+C
    anchor-based one; raises ValueError when no layout fits."""
    if ppu:
        return YoloOutput(YoloLayout.ppu)

    if len(shapes) == 0:
        raise ValueError("the model reports no output tensor")

    if len(shapes) > 1:
        return _infer_multipart(shapes, num_classes)

    if dynamic_output:
        return YoloOutput(YoloLayout.nms_in_head, NMS_IN_HEAD_COLUMNS)

    dims = _significant_dims(shapes[0])

    if len(dims) == 1:
        # a single row keeps only its column count
        dims = [1, dims[0]]

    if len(dims) != 2:
        raise ValueError(f"unexpected output shape {tuple(shapes[0])}")

    candidates = [
        (NMS_IN_HEAD_COLUMNS, YoloLayout.nms_in_head),
        (4 + num_classes, YoloLayout.anchor_free),
        (5 + num_classes, YoloLayout.anchor),
    ]
    hits = [(d, layout) for d in dims for width, layout in candidates if d == width]

    if not hits:
        raise ValueError(
            f"output shape {tuple(shapes[0])} does not match a YOLO head with "
            f"{num_classes} classes (expected a {4 + num_classes}, "
            f"{5 + num_classes} or {NMS_IN_HEAD_COLUMNS} column output). Check that "
            "labelmap_path matches the model, usually /labelmap/coco-80.txt."
        )

    widths = {d for d, _ in hits}

    if len(widths) > 1:
        names = ", ".join(f"{d} columns ({layout.value})" for d, layout in hits)
        raise ValueError(
            f"output shape {tuple(shapes[0])} fits two layouts, {names}, and "
            "the label map cannot tell them apart"
        )

    width = widths.pop()
    rows = next(d for d in dims if d != width) if dims[0] != dims[1] else dims[0]
    layouts = [layout for _, layout in hits]

    if len(layouts) == 1:
        return YoloOutput(layouts[0], width)

    # 6 columns is both NMS-in-head and a 1 or 2 class raw head; a raw head
    # has thousands of candidate rows, a head with NMS has a few hundred
    raw = next(layout for layout in layouts if layout is not YoloLayout.nms_in_head)
    if rows > NMS_IN_HEAD_MAX_ROWS:
        return YoloOutput(raw, width)

    return YoloOutput(YoloLayout.nms_in_head, width)


def _infer_multipart(shapes: list[tuple[int, ...]], num_classes: int) -> YoloOutput:
    """Accept only what the shared multipart decoder reads."""
    reason = None

    if num_classes != MULTIPART_CLASSES:
        reason = f"the shared decoder reads {MULTIPART_CLASSES}-class heads only"
    elif len(shapes) != MULTIPART_OUTPUTS:
        reason = f"expected {MULTIPART_OUTPUTS} feature maps, got {len(shapes)}"
    elif any(len(shape) != 4 or shape[1] != MULTIPART_CHANNELS for shape in shapes):
        reason = f"expected NCHW maps with {MULTIPART_CHANNELS} channels"

    if reason is not None:
        raise ValueError(
            f"output shapes {[tuple(shape) for shape in shapes]} are not the "
            f"per-scale feature maps of an anchor-based YOLO head ({reason}). "
            "If this is a DAMO-YOLO model set model_type to damo-yolo; "
            "otherwise export the model with its detection head included."
        )

    return YoloOutput(YoloLayout.multipart)


def validate_damoyolo_outputs(shapes: list[tuple[int, ...]], num_classes: int) -> None:
    """Fail unless the model emits DAMO-YOLO's (1, N, num_classes) scores
    and (1, N, 4) boxes."""
    dims = [_significant_dims(shape) for shape in shapes]
    box_like = [d for d in dims if len(d) == 2 and d[1] == 4]
    class_like = [d for d in dims if len(d) == 2 and d[1] == num_classes]

    if (
        len(shapes) == 2
        and len(box_like) == 1
        and len(class_like) == 1
        and box_like[0][0] == class_like[0][0]
    ):
        return

    raise ValueError(
        f"output shapes {[tuple(shape) for shape in shapes]} are not DAMO-YOLO's "
        f"(1, N, {num_classes}) scores and (1, N, 4) boxes. Check that "
        "labelmap_path matches the model, usually /labelmap/coco-80.txt, and "
        "that model_type matches the compiled model; a YOLO model needs "
        "model_type yolo-generic."
    )


def rows_with_columns(tensor: np.ndarray, columns: int) -> np.ndarray:
    """(N, columns) rows, transposing a channel-major export first."""
    if tensor.ndim >= 2 and tensor.shape[-1] != columns and tensor.shape[-2] == columns:
        tensor = np.swapaxes(tensor, -1, -2)

    return tensor.reshape(-1, columns)


def reinterpret(tensor: np.ndarray, byte_range: tuple[int, int], dtype) -> np.ndarray:
    """Read a byte column range of a uint8 record array as `dtype`."""
    lo, hi = byte_range
    return np.ascontiguousarray(tensor[:, lo:hi]).view(dtype)


def ppu_records(outputs: list[np.ndarray]) -> np.ndarray | None:
    """The (N, 32) uint8 record array a PPU model emits, or None."""
    if not outputs or outputs[0].ndim < 2 or outputs[0].size == 0:
        # no candidate cleared the on-NPU filter this frame
        return None

    records = outputs[0][0]

    if records.ndim != 2 or records.shape[1] != PPU_RECORD_SIZE:
        logger.debug("Unexpected PPU output shape %s, skipping frame", records.shape)
        return None

    return records


def ppu_boxes_are_anchor_based(boxes: np.ndarray) -> bool | None:
    """A value above 1 settles anchor-free (raw sigmoids stay inside 0..1),
    a frame strictly inside 0..1 settles anchor-based, anything else is
    None."""
    if len(boxes) == 0:
        return None

    if np.any(boxes > 1.0):
        return False

    if np.all((boxes > 0.0) & (boxes <= 1.0)):
        return True

    return None


def ppu_layout_is_anchor_based(outputs: list[np.ndarray]) -> bool | None:
    """Whether this PPU model's records are anchor-based, or None when the
    frame cannot tell; the caller keeps the first conclusive answer."""
    records = ppu_records(outputs)

    if records is None:
        return None

    boxes = reinterpret(records, PPU_BOX_BYTES, np.float32).reshape(-1, 4)

    return ppu_boxes_are_anchor_based(boxes)


def ppu_needs_grid_decode(records: np.ndarray) -> bool:
    """Whether the layer field is real pyramid-level info (YOLOX-style,
    still grid-relative) rather than a constant, unused value."""
    layer_idx = reinterpret(records, PPU_GRID_BYTES, np.uint8)[:, 3]

    return len(np.unique(layer_idx)) > 1


def ppu_scale_count_lower_bound(records: np.ndarray, width: int, height: int) -> int:
    """The fewest detection scales these records can come from. Each proves
    one past its layer index, and its grid cell can prove more: cell g of
    layer L only exists if that layer's stride keeps stride * g < input,
    and the stride is PPU_MAX_STRIDE >> (scales - 1 - L), so a cell too
    far right or down for a coarse stride forces finer strides below it.
    Only a lower bound: nothing in a record rules out scales above it."""
    grid = reinterpret(records, PPU_GRID_BYTES, np.uint8)
    grid_y = grid[:, 0].astype(np.int64)
    grid_x = grid[:, 1].astype(np.int64)
    layer_idx = grid[:, 3].astype(np.int64)

    # strides from the coarsest down; each one a cell overflows is one more
    # halving the layer needs, i.e. one more scale below it
    strides = PPU_MAX_STRIDE >> np.arange(PPU_MAX_STRIDE.bit_length())
    overflow_x = (strides[None, :] * grid_x[:, None] >= width).sum(axis=1)
    overflow_y = (strides[None, :] * grid_y[:, None] >= height).sum(axis=1)

    return int((layer_idx + 1 + np.maximum(overflow_x, overflow_y)).max())


def resolve_scale_count(
    records: np.ndarray, scale_count: int | None, width: int, height: int
) -> int:
    """`scale_count` if given, else the fewest scales this frame alone
    proves, defaulting to 3 when the frame has no records to read."""
    if scale_count is not None:
        return scale_count

    if len(records) == 0:
        return 3

    return ppu_scale_count_lower_bound(records, width, height)


def ppu_grid_regression_geometry(
    records: np.ndarray, boxes: np.ndarray, scale_count: int
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Pixel centre and size for a YOLOX-style grid-relative box: centre
    offset from the grid cell, size a log-scale multiple of the stride.
    `scale_count` picks the stride each layer_idx was measured in."""
    grid = reinterpret(records, PPU_GRID_BYTES, np.uint8)
    grid_y = grid[:, 0].astype(np.float32)
    grid_x = grid[:, 1].astype(np.float32)
    layer_idx = grid[:, 3].astype(np.int32)

    known = layer_idx < scale_count
    layer = np.where(known, layer_idx, 0)
    stride = (PPU_MAX_STRIDE >> (scale_count - 1 - layer)).astype(np.float32)

    centre_x = (boxes[:, 0] + grid_x) * stride
    centre_y = (boxes[:, 1] + grid_y) * stride
    box_w = np.exp(boxes[:, 2]) * stride
    box_h = np.exp(boxes[:, 3]) * stride

    return centre_x, centre_y, box_w, box_h, known


def ppu_anchor_geometry(
    records: np.ndarray, boxes: np.ndarray, scale_count: int
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Pixel centre and size for anchor-based PPU records, with the mask of
    records the anchor table covers. `scale_count` picks the table and
    stride; below the largest table it is under-evidenced, not disproven,
    so it still gets that table as a best guess, but above it every record
    is left unplaced instead of guessing at the wrong table."""
    grid = reinterpret(records, PPU_GRID_BYTES, np.uint8)
    grid_y = grid[:, 0].astype(np.float32)
    grid_x = grid[:, 1].astype(np.float32)
    box_idx = grid[:, 2].astype(np.int32)
    layer_idx = grid[:, 3].astype(np.int32)

    anchor_table = PPU_ANCHORS_BY_SCALES.get(scale_count)
    if anchor_table is None:
        if scale_count > PPU_MAX_KNOWN_SCALES:
            # a real head proven to have more scales than any table covers
            zeros = np.zeros(len(layer_idx), np.float32)
            return zeros, zeros, zeros, zeros, np.zeros(len(layer_idx), dtype=bool)

        anchor_table = PPU_ANCHORS_BY_SCALES[PPU_MAX_KNOWN_SCALES]

    levels, per_level = anchor_table.shape[:2]
    known = (layer_idx < levels) & (box_idx < per_level)

    # index the table with the out-of-range rows folded onto a real entry,
    # then let the mask drop them rather than raising here
    layer = np.where(known, layer_idx, 0)
    anchors = anchor_table[layer, np.where(known, box_idx, 0)]
    stride = (PPU_MAX_STRIDE >> (levels - 1 - layer)).astype(np.float32)

    centre_x = (boxes[:, 0] * 2.0 - 0.5 + grid_x) * stride
    centre_y = (boxes[:, 1] * 2.0 - 0.5 + grid_y) * stride
    box_w = (boxes[:, 2] * 2.0) ** 2 * anchors[:, 0]
    box_h = (boxes[:, 3] * 2.0) ** 2 * anchors[:, 1]

    return centre_x, centre_y, box_w, box_h, known


def decode_ppu(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
    nms_threshold: float,
    anchor_based: bool | None = None,
    scale_count: int | None = None,
    needs_grid_decode: bool | None = None,
    records: np.ndarray | None = None,
) -> np.ndarray:
    """Decode PPU records, leaving only NMS. `anchor_based` and
    `needs_grid_decode` skip their heuristics once settled by a caller
    tracking them across frames; `scale_count` picks the anchor table or
    stride, defaulting to what this frame alone shows; `records` reuses an
    already-parsed buffer instead of re-parsing `outputs`."""
    if records is None:
        records = ppu_records(outputs)

    if records is None:
        return np.zeros((20, 6), np.float32)

    boxes = reinterpret(records, PPU_BOX_BYTES, np.float32).reshape(-1, 4)

    if anchor_based is None:
        anchor_based = ppu_boxes_are_anchor_based(boxes)

    if anchor_based is None:
        # nothing conclusive in this frame; no pixel box to draw either
        return np.zeros((20, 6), np.float32)

    scores = reinterpret(records, PPU_SCORE_BYTES, np.float32).flatten()
    labels = reinterpret(records, PPU_LABEL_BYTES, np.uint32).flatten()

    if anchor_based:
        scale_count = resolve_scale_count(records, scale_count, width, height)
        centre_x, centre_y, box_w, box_h, known = ppu_anchor_geometry(
            records, boxes, scale_count
        )
        # a record the table cannot place is dropped by the score filter
        scores = np.where(known, scores, 0.0)
    else:
        if needs_grid_decode is None:
            needs_grid_decode = ppu_needs_grid_decode(records)

        if needs_grid_decode:
            scale_count = resolve_scale_count(records, scale_count, width, height)
            centre_x, centre_y, box_w, box_h, known = ppu_grid_regression_geometry(
                records, boxes, scale_count
            )
            scores = np.where(known, scores, 0.0)
        else:
            centre_x, centre_y = boxes[:, 0], boxes[:, 1]
            box_w, box_h = boxes[:, 2], boxes[:, 3]

    x_min = centre_x - box_w * 0.5
    y_min = centre_y - box_h * 0.5

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
    columns: int | None = None,
) -> np.ndarray:
    """Decode an anchor-based head: (N, 5+C) rows of cx, cy, w, h,
    objectness and class scores in pixels, transposed when `columns` says
    so. Confidence is objectness times the best class score."""
    tensor = outputs[0]

    if tensor.ndim < 2 or tensor.size == 0:
        return np.zeros((20, 6), np.float32)

    predictions = rows_with_columns(tensor, columns or tensor.shape[-1])

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


def decode_raw_nms_in_head(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
) -> np.ndarray:
    """Decode a head that already ran NMS: (N, 6) rows of corner box,
    score and class in pixels; only the score filter is left."""
    tensor = outputs[0]

    if tensor.ndim < 2 or tensor.size == 0:
        return np.zeros((20, 6), np.float32)

    predictions = rows_with_columns(tensor, NMS_IN_HEAD_COLUMNS)

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


def decode_damoyolo_raw(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
    nms_threshold: float,
) -> np.ndarray | None:
    """Decode DAMO-YOLO's output: DX-COM folds the DFL box head into the
    model, so it emits (1, N, num_classes) sigmoid class scores and (1, N, 4)
    boxes as x_min, y_min, x_max, y_max in input pixels, in either order.
    Anchor-free with no objectness column, leaving the score filter and NMS.

    Returns None when the outputs are not that pair at all, which is a
    mismatch between the model and the config rather than an empty frame, and
    stays wrong for every frame after it. A frame that simply held nothing
    over the threshold comes back as the empty detection array.
    """
    split = _split_box_and_class_outputs(outputs)

    if split is None:
        logger.debug(
            "Could not identify DAMO-YOLO box/class outputs in %d tensor(s) with "
            "shapes %s",
            len(outputs),
            _shapes(outputs),
        )
        return None

    box_output, cls_scores = split

    if cls_scores.ndim != 3 or cls_scores.shape[0] == 0 or cls_scores.shape[1] == 0:
        logger.debug("Unexpected DAMO-YOLO class output shape %s", cls_scores.shape)
        return None

    cls_scores = cls_scores[0]
    boxes = box_output[0]
    num_priors = cls_scores.shape[0]

    if boxes.shape[0] != num_priors:
        logger.debug(
            "DAMO-YOLO box count %d does not match class count %d",
            boxes.shape[0],
            num_priors,
        )
        return None

    x_min, y_min, x_max, y_max = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
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
    device: str = Field(
        default="",
        title="DEEPX device",
        description="Which NPU this detector binds to, as PCIe:<index>. "
        "Empty selects the first NPU.",
    )

    @field_validator("device")
    @classmethod
    def validate_device(cls, value: str) -> str:
        """Reject an unusable device at startup rather than at first inference."""
        resolve_device(value)
        return value

    @model_validator(mode="after")
    def validate_model_type_is_supported(self):
        """Reject a model type with no decoder here (Frigate defaults it to
        ssd). The model is None while a bare device string is validated."""
        if self.model is None:
            return self

        if self.model.model_type not in SUPPORTED_MODEL_TYPES:
            supported = ", ".join(t.value for t in SUPPORTED_MODEL_TYPES)
            raise ValueError(
                f"model_type '{self.model.model_type.value}' is not supported "
                f"by the DEEPX detector. Set model.model_type to one of: {supported}."
            )

        return self


class DeepxDetector(DetectionApi):
    """DEEPX NPU detector: DX-RT session plus the decoder the model needs."""

    type_key = DETECTOR_KEY
    runtime_manifest = DEEPX_MANIFEST

    def __init__(self, config: DeepxDetectorConfig):
        self.activate_dependencies()

        # skip DX-RT's abstract-socket attempt, which cannot leave the container
        if not os.environ.get(DXRT_IPC_ENDPOINT_ENV):
            os.environ[DXRT_IPC_ENDPOINT_ENV] = DXRT_IPC_SOCKET
        endpoint = os.environ[DXRT_IPC_ENDPOINT_ENV]

        if not endpoint.startswith("@") and not os.path.exists(endpoint):
            # DX-RT reports this as a bare connect error several layers down,
            # so name the missing socket while there is still context for it
            logger.warning(
                "No dxrtd socket at %s. Rerun the DEEPX installation script on "
                "the host so dxrt.service listens there, mount /run/dxrt into "
                "the container, or set %s to where the daemon actually listens",
                endpoint,
                DXRT_IPC_ENDPOINT_ENV,
            )

        try:
            from dx_engine import Configuration, InferenceEngine, InferenceOption
        except ModuleNotFoundError:
            raise ImportError(
                "The DX-RT python bindings are not installed. Frigate installs "
                "them at startup when a DEEPX detector is configured; check the "
                "startup log for errors."
            ) from None

        # DX-RT checks for dxrtd by scanning /proc, which cannot see the host
        # daemon from a container. SERVICE only gates that scan; the IPC
        # client still uses the socket and fails loudly if dxrtd is down.
        Configuration().set_enable(Configuration.ITEM.SERVICE, False)

        super().__init__(config)

        self.model_type = config.model.model_type
        model_path = config.model.path

        if not model_path or not os.path.isfile(model_path):
            raise FileNotFoundError(
                f"DEEPX model '{model_path}' was not found. Compile a model with "
                "DX-COM or download one from the DEEPX ModelZoo, then point "
                "model.path at the .dxnn file."
            )

        device = resolve_device(config.device)
        logger.info("Loading DEEPX model %s on device %s", model_path, device)

        options = InferenceOption()
        options.devices = [device]
        options.bound_option = InferenceOption.BOUND_OPTION.NPU_ALL

        self.session = InferenceEngine(str(model_path), options)
        self.output = self.inspect_model(config)
        self.logged_layout = False
        # set once a frame proves the PPU head anchor-free, then kept
        self.ppu_anchor_free = False
        # set once proven needed, then kept
        self.ppu_needs_grid_decode = False
        self.ppu_scale_count = 0
        self.ppu_unsupported_scale_reported = False
        self.damoyolo_outputs_reported = False

    def inspect_model(self, config: DeepxDetectorConfig) -> YoloOutput | None:
        """Pick the decoder from what the runtime reports, failing here
        rather than on the first frame."""
        shapes = [
            tuple(info["shape"]) for info in self.session.get_output_tensors_info()
        ]

        try:
            num_classes = class_count(config.model.merged_labelmap)

            if self.model_type == ModelTypeEnum.damoyolo:
                if self.session.is_ppu():
                    raise ValueError(
                        "DAMO-YOLO models compiled with PPU support are not supported"
                    )

                validate_damoyolo_outputs(shapes, num_classes)
                return None

            output = infer_yolo_layout(
                shapes,
                num_classes,
                self.session.is_ppu(),
                self.session.has_dynamic_output(),
            )
        except ValueError as err:
            raise ValueError(
                f"Cannot decode DEEPX model '{config.model.path}': {err}"
            ) from None

        logger.info(
            "DEEPX decoding yolo-generic output as %s with %d classes",
            output.layout.value,
            num_classes,
        )
        return output

    def decode(self, outputs: list[np.ndarray]) -> np.ndarray:
        """Decode the model output according to its type and detected layout."""
        if self.model_type == ModelTypeEnum.damoyolo:
            return self.decode_damoyolo(outputs)

        match self.output.layout:
            case YoloLayout.ppu:
                return self.decode_ppu(outputs)
            case YoloLayout.anchor:
                return decode_raw_anchor(
                    outputs,
                    self.width,
                    self.height,
                    SCORE_THRESHOLD,
                    NMS_THRESHOLD,
                    self.output.columns,
                )
            case YoloLayout.anchor_free:
                # the shared decoder reads (N, 4+C) with the same thresholds;
                # hand it rows so its own orientation guess is never needed
                rows = rows_with_columns(outputs[0], self.output.columns)
                return post_process_yolo([rows], self.width, self.height)
            case YoloLayout.nms_in_head:
                return decode_raw_nms_in_head(
                    outputs, self.width, self.height, SCORE_THRESHOLD
                )
            case _:
                # per-scale feature maps, same thresholds as above
                return post_process_yolo(outputs, self.width, self.height)

    def decode_ppu(self, outputs: list[np.ndarray]) -> np.ndarray:
        """Decode PPU records, keeping each heuristic once a frame settles
        it: anchor-free, needs-grid-decode, and scale count all only
        move toward more certainty, never back. The scale count is the
        largest lower bound any frame has proven, so a three-scale head
        whose frames so far only held its finer layers near the origin
        reads against the two-scale table until a record lands far enough
        right or down, or on the coarsest layer, to prove the third."""
        if self.ppu_anchor_free:
            anchor_based = False
        else:
            anchor_based = ppu_layout_is_anchor_based(outputs)
            self.ppu_anchor_free = anchor_based is False

        records = ppu_records(outputs)
        if records is not None and len(records):
            self.ppu_scale_count = max(
                self.ppu_scale_count,
                ppu_scale_count_lower_bound(records, self.width, self.height),
            )

            if not anchor_based and not self.ppu_needs_grid_decode:
                self.ppu_needs_grid_decode = ppu_needs_grid_decode(records)

        if (
            anchor_based
            and self.ppu_scale_count
            and self.ppu_scale_count not in PPU_ANCHORS_BY_SCALES
            and not self.ppu_unsupported_scale_reported
        ):
            self.ppu_unsupported_scale_reported = True
            logger.error(
                "This PPU model's anchor-based head reports %d detection "
                "scales, which Frigate has no anchor table for (supported: "
                "%s); its detections cannot be decoded",
                self.ppu_scale_count,
                ", ".join(str(n) for n in sorted(PPU_ANCHORS_BY_SCALES)),
            )

        # None here means nothing conclusive in this frame, and no box to
        # draw either
        return decode_ppu(
            outputs,
            self.width,
            self.height,
            SCORE_THRESHOLD,
            NMS_THRESHOLD,
            anchor_based=anchor_based,
            scale_count=self.ppu_scale_count or None,
            needs_grid_decode=True if self.ppu_needs_grid_decode else None,
            records=records,
        )

    def decode_damoyolo(self, outputs: list[np.ndarray]) -> np.ndarray:
        """Decode DAMO-YOLO output, reporting once if a frame lacks the
        expected tensor pair."""
        detections = decode_damoyolo_raw(
            outputs, self.width, self.height, SCORE_THRESHOLD, NMS_THRESHOLD
        )

        if detections is None:
            if not self.damoyolo_outputs_reported:
                self.damoyolo_outputs_reported = True
                logger.error(
                    "This model does not emit the pair of tensors the DAMO-YOLO "
                    "decoder reads, one (1, N, 4) of boxes and one (1, N, "
                    "num_classes) of scores, but %d tensor(s) with shapes %s. "
                    "Check that model_type matches the compiled model; a YOLO "
                    "model needs model_type yolo-generic",
                    len(outputs),
                    _shapes(outputs),
                )

            return np.zeros((20, 6), np.float32)

        return detections

    def detect_raw(self, tensor_input):
        """Run inference and decode the model output."""
        outputs = self.session.run([tensor_input])

        if not isinstance(outputs, list):
            outputs = [outputs]

        if not self.logged_layout:
            # before decoding, so a decode failure still leaves the shapes
            self.logged_layout = True
            self.log_layout(tensor_input, outputs)

        detections = self.decode(outputs)

        if logger.isEnabledFor(logging.DEBUG):
            logger.debug(
                "DEEPX decoded %d detections, best score %.4f",
                int((detections[:, 1] > 0).sum()),
                float(detections[:, 1].max()),
            )

        return detections

    def log_layout(self, tensor_input, outputs: list[np.ndarray]) -> None:
        """Log the real tensor layout once, since a wrong decode returns empty
        detections rather than failing."""
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
