"""DEEPX NPU detector running compiled .dxnn models via the DX-RT runtime."""

import atexit
import glob
import logging
import os
import subprocess
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

# Installed at first start rather than shipped in the image. DEEPX's PyPI
# wheels are byte-identical to the ones libdxrt-bin carries, so the host
# runtime and the container bindings come from one vendor build.
DXRT_VERSION = "3.4.0"

# Where dxrtd, running on the host, accepts client connections. The abstract
# socket it also listens on cannot be reached from a container (verified).
DXRT_IPC_ENDPOINT_ENV = "DXRT_DYNAMIC_IPC_ENDPOINT"
DXRT_IPC_SOCKET = "/tmp/dxrt_dynamic_ipc.sock"

# DX-RT decides whether dxrtd runs by scanning /proc for a cmdline holding
# "dxrtd" (checkService, lib/device_pool/service_util.cpp). The daemon lives on
# the host, and sharing its PID namespace is closed to us because s6-overlay
# demands PID 1, so a placeholder carrying that name answers the scan while the
# real work goes to the host over DXRT_IPC_SOCKET.
_SERVICE_PLACEHOLDER: subprocess.Popen | None = None


def service_is_visible() -> bool:
    """Whether a process named dxrtd is visible in this PID namespace."""
    for path in glob.glob("/proc/[0-9]*/cmdline"):
        try:
            with open(path, "rb") as f:
                if b"dxrtd" in f.read():
                    return True
        except OSError:
            continue

    return False


def satisfy_service_check(socket_path: str) -> None:
    """Make DX-RT's liveness scan succeed when the daemon runs on the host.

    A no-op when a dxrtd is visible, or when `socket_path` is absent so a
    genuinely stopped daemon still reports itself.
    """
    global _SERVICE_PLACEHOLDER

    if _SERVICE_PLACEHOLDER is not None and _SERVICE_PLACEHOLDER.poll() is None:
        return

    if service_is_visible():
        return

    if not os.path.exists(socket_path):
        logger.warning(
            "No dxrtd socket at %s. Start dxrt.service on the host and mount "
            "the socket into the container.",
            socket_path,
        )
        return

    try:
        _SERVICE_PLACEHOLDER = subprocess.Popen(
            ["dxrtd", "infinity"],
            executable="/bin/sleep",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except OSError as err:
        logger.error("Could not satisfy the DX-RT service check: %s", err)
        return

    atexit.register(_stop_service_placeholder)
    logger.debug(
        "Standing in for the host dxrtd in this namespace as pid %d",
        _SERVICE_PLACEHOLDER.pid,
    )


def _stop_service_placeholder() -> None:
    if _SERVICE_PLACEHOLDER is not None and _SERVICE_PLACEHOLDER.poll() is None:
        _SERVICE_PLACEHOLDER.terminate()


# PyPI paths carry a per-file digest, so each URL is written out in full; a
# version bump has to replace it, which the manifest tests check for.
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


class DeepxModelTypeEnum(str, Enum):
    """The subset of Frigate's model types the DEEPX decoders can read.

    `model_type` sits on the root `model` block, where an omitted value
    defaults to `ssd`; a model validator rejects anything not listed here so a
    type with no DEEPX decoder fails at startup rather than being decoded as
    yolo-generic. `ssd` is left out on purpose: DX-COM compiles no SSD head
    this detector can read.
    """

    # PPU-compiled models still use yolo-generic; the `ppu` option is what
    # selects the decode path, since there is no PPU-specific model type.
    yologeneric = ModelTypeEnum.yologeneric.value
    damoyolo = ModelTypeEnum.damoyolo.value


class ModelFormatEnum(str, Enum):
    """How a .dxnn file's output is decoded. DX-COM preserves the source
    model's head, so the layout has to be named; a model_validator keeps each
    value with its own `model_type`.
    """

    # The default. yolo-generic infers the layout from the output shape and
    # damo-yolo takes none. A real member rather than None so the config form
    # round-trips a value -- a null is written back as a deletion.
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

# The feature-map strides a PPU record's layer index selects between.
PPU_STRIDES = np.array([8, 16, 32], dtype=np.float32)
PPU_ANCHOR_LAYERS = len(PPU_STRIDES)

# Byte layout of the fixed-width detection record the PPU emits.
PPU_RECORD_SIZE = 32
PPU_BOX_BYTES = (0, 16)
PPU_GRID_BYTES = (16, 20)
PPU_SCORE_BYTES = (20, 24)
PPU_LABEL_BYTES = (24, 28)


# DAMO-YOLO's ZeroHead is anchor-free at these three strides regardless of
# size (TinyNAS-L20T/S/M/L differ only in backbone depth/width).
DAMOYOLO_STRIDES = (8, 16, 32)


def _flatten(group):
    """Yield a nested sequence one level flat, leaving a flat one alone."""
    for item in group:
        if isinstance(item, (list, tuple)):
            yield from item
        else:
            yield item


def parse_anchors(value: str) -> dict[int, np.ndarray]:
    """Parse the anchor table an anchor-based PPU model was trained with.

    One group per layer separated by ";" in PPU_STRIDES order, each a flat run
    of width,height pairs, keyed by stride the way decode_ppu_anchor reads it.
    """
    groups = [group for group in value.split(";") if group.strip()]

    if len(groups) != PPU_ANCHOR_LAYERS:
        strides = ", ".join(str(int(stride)) for stride in PPU_STRIDES)
        raise ValueError(
            f"expected {PPU_ANCHOR_LAYERS} anchor groups separated by ';', one "
            f"per feature-map layer for strides {strides}, got {len(groups)}"
        )

    parsed = []

    for group in groups:
        try:
            numbers = [float(part) for part in group.split(",") if part.strip()]
        except ValueError:
            raise ValueError(
                f'anchor group "{group.strip()}" is not a comma-separated list '
                "of numbers"
            ) from None

        if not numbers or len(numbers) % 2:
            raise ValueError(
                f'anchor group "{group.strip()}" is not an even-length list of '
                "width,height pairs"
            )

        if any(number <= 0 for number in numbers):
            raise ValueError(
                f'anchor group "{group.strip()}" has a width or height that is '
                "not positive"
            )

        parsed.append(np.array(numbers, dtype=np.float32).reshape(-1, 2))

    # a record picks its anchor with a bare index and its layer separately, so
    # that index only means one thing if every layer offers the same count
    if len({len(anchors) for anchors in parsed}) != 1:
        counts = ", ".join(str(len(anchors)) for anchors in parsed)
        raise ValueError(
            f"every anchor group must hold the same number of pairs, got {counts}"
        )

    return {
        int(stride): anchors
        for stride, anchors in zip(PPU_STRIDES, parsed, strict=True)
    }


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


def reinterpret(tensor: np.ndarray, byte_range: tuple[int, int], dtype) -> np.ndarray:
    """Read a byte column range of a uint8 PPU tensor as `dtype`, copied
    first because numpy will not reinterpret non-contiguous memory."""
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
    """Split a 2-tensor raw output into (box tensor, class tensor) by shape,
    for model types where DX-COM's order is not confirmed: a box-like (..., 4)
    or (..., 4, bins) wins, None when ambiguous as with 4 classes."""
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
        # Separates "the decode produced nothing" from "every score fell under
        # the threshold", identical from the empty detection array alone.
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
    anchors: dict[int, np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
    nms_threshold: float,
) -> np.ndarray:
    """Decode PPU output from an anchor-based head into Frigate's (20, 6) rows.

    The NPU has already dropped sub-threshold candidates, leaving the anchor
    decode and NMS. A record names its anchor by index, so `anchors` has to be
    the table the model was trained with.
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

    # Both indices come off the wire and either could read past the tables
    # below, so a malformed record skips the frame rather than crashing.
    anchors_per_layer = len(next(iter(anchors.values())))

    if np.any(layer_idx >= PPU_ANCHOR_LAYERS) or np.any(
        anchor_idx >= anchors_per_layer
    ):
        logger.debug(
            "PPU record indexes layer %d / anchor %d, outside the %d layers and "
            "%d anchors per layer configured, skipping frame",
            layer_idx.max(),
            anchor_idx.max(),
            PPU_ANCHOR_LAYERS,
            anchors_per_layer,
        )
        return np.zeros((20, 6), np.float32)

    stride = PPU_STRIDES[layer_idx]
    anchor_w = np.zeros(len(boxes), dtype=np.float32)
    anchor_h = np.zeros(len(boxes), dtype=np.float32)

    for layer_stride, layer_anchors in anchors.items():
        mask = stride == layer_stride

        if np.any(mask):
            anchor_w[mask] = layer_anchors[anchor_idx[mask], 0]
            anchor_h[mask] = layer_anchors[anchor_idx[mask], 1]

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
    """Decode PPU output from an anchor-free head: no anchors and no
    objectness, so the box arrives as (cx, cy, w, h) pixels. Running the
    anchor formula over the unused grid columns is what yields absurd boxes.
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
    """Decode raw output from an anchor-based head: (N, 5+C) rows of
    [cx, cy, w, h, objectness, class scores...] in pixels. Confidence is
    objectness times the best class score, which is what parts this from the
    anchor-free layout, where column 4 is already a class.
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

    One tensor with no objectness column, (4+C, N) or (N, 4+C), boxes as
    (cx, cy, w, h) pixels. `model_format: auto` lands here too, reading every
    column past the box as a class, which only holds for an anchor-free head.
    """
    predictions = outputs[0]

    # Drop the batch axis without a blind squeeze, which would also collapse
    # the box count on a single-candidate frame. Fold leading axes into rows.
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
    """Decode raw output from a head that already ran NMS: (N, 6) rows of
    [x_min, y_min, x_max, y_max, score, class] in pixels, sorted by score, so
    only the score filter and normalization are left.
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


def _dfl_integral(distribution: np.ndarray) -> np.ndarray:
    """Reduce a DFL distribution to an expected distance via weighted sum.
    From DAMO-YOLO's Integral module (Apache-2.0): each box side spans
    `reg_max + 1` bins, reduced to one distance in stride units."""
    reg_max = distribution.shape[-1] - 1
    project = np.arange(reg_max + 1, dtype=np.float32)
    return distribution @ project


def _damoyolo_center_priors(
    width: int, height: int, strides: tuple[int, ...]
) -> np.ndarray:
    """One (center_x, center_y, stride) row per grid cell across all scales, in
    pixels. From DAMO-YOLO's ZeroHead.get_single_level_center_priors."""
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

    From DAMO-YOLO's ZeroHead (Apache-2.0). Anchor-free, but boxes are per-side
    DFL histograms, not the pixel distances decode_raw_anchor_free expects.
    Takes two tensors in either order: (1, N, num_classes) sigmoid scores, and
    boxes as (1, N, 4, reg_max + 1) raw DFL decoded here, or (1, N, 4) pixel
    corners should DX-COM fold it in. Unverified against a compiled model.
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
        # raw per-side DFL: softmax the bins, reduce to a distance in stride
        # units, then scale by each prior's stride against its own center
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
    device: str = Field(
        default="",
        title="DEEPX device",
        description="Which NPU this detector binds to, as PCIe:<index>. "
        "Empty selects the first NPU.",
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
        "for every yolo-generic variant and cannot be inferred. damo-yolo "
        "reads one fixed layout and takes no value here.",
    )
    anchors: str = Field(
        default="",
        title="Anchor sizes an anchor-based PPU model was trained with",
        description="The model's own anchor table, as one group of "
        "comma-separated width,height pairs per feature-map layer, groups "
        'separated by ";" in stride order 8, 16, 32. Required when ppu is '
        "true and model_format is anchor, and not used otherwise: a PPU "
        "record names its anchor by index only, so the table has to come "
        "from the model. Copy it from the config the model was trained with.",
    )
    score_threshold: float = Field(
        default=0.25,
        title="Score threshold used when decoding detector output",
    )
    nms_threshold: float = Field(
        default=0.45,
        title="NMS IoU threshold used when decoding detector output",
    )

    @field_validator("device")
    @classmethod
    def validate_device(cls, value: str) -> str:
        """Reject an unusable device at startup rather than at first inference."""
        resolve_device(value)
        return value

    @field_validator("anchors", mode="before")
    @classmethod
    def coerce_anchors(cls, value):
        """Accept the nested list a model's config declares anchors in, flat
        row or explicit pairs, as well as the string the form writes."""
        if value is None:
            return ""

        if isinstance(value, (list, tuple)):
            return ";".join(
                ",".join(str(number) for number in _flatten(group)) for group in value
            )

        return value

    @field_validator("anchors")
    @classmethod
    def validate_anchors(cls, value: str) -> str:
        """Reject an anchor table that can't be read, so the error surfaces at
        config load rather than on the first frame."""
        if not value.strip():
            return ""

        try:
            parse_anchors(value)
        except ValueError as err:
            raise ValueError(f"anchors could not be read: {err}") from None

        return value

    @field_validator("model_format", mode="before")
    @classmethod
    def coerce_model_format(cls, value):
        """A blank or absent entry means "no explicit layout"."""
        if value is None or (isinstance(value, str) and not value.strip()):
            return ModelFormatEnum.auto

        return value

    @property
    def resolved_model_type(self) -> DeepxModelTypeEnum | None:
        """The model type the decoders will actually run, read off the root
        model block. None while the model is still unresolved, which is how a
        device string is checked on its own before any model is attached."""
        if self.model is None:
            return None

        return DeepxModelTypeEnum(self.model.model_type.value)

    @model_validator(mode="after")
    def validate_model_type_is_supported(self):
        """Reject a model type no DEEPX decoder reads. Frigate defaults
        model_type to ssd, which would otherwise fall through to the
        yolo-generic decode path and return nonsense instead of an error."""
        if self.model is None:
            return self

        try:
            DeepxModelTypeEnum(self.model.model_type.value)
        except ValueError:
            supported = ", ".join(member.value for member in DeepxModelTypeEnum)
            raise ValueError(
                f"model_type '{self.model.model_type.value}' has no DEEPX "
                f"decoder. Set model.model_type to one of: {supported}."
            ) from None

        return self

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

        if self.resolved_model_type is DeepxModelTypeEnum.damoyolo:
            raise ValueError(
                'PPU is not yet supported for model_type "damo-yolo". Set ppu to false.'
            )

        return self

    @model_validator(mode="after")
    def validate_ppu_requires_model_format(self):
        """Reject an unset model_format when ppu is enabled. Every
        yolo-generic variant shares one PPU record layout, so there is no
        shape to infer from, and defaulting to the anchor-based decoder
        corrupts anchor-free detections rather than failing loudly."""
        if self.ppu and self.model_format is ModelFormatEnum.auto:
            raise ValueError(
                "model_format must be set when ppu is true. The PPU output "
                "layout can't be inferred, and guessing wrong silently "
                "corrupts detections."
            )

        return self

    @model_validator(mode="after")
    def validate_anchors_match_the_decode_path(self):
        """Require an anchor table for the one decode that reads it, and
        reject one anywhere else. A record names its anchor by index only and
        the table behind it differs per model, so a built-in default would
        silently rescale every box. Refuse to guess."""
        reads_anchors = self.ppu and self.model_format in ANCHOR_FORMATS

        if reads_anchors and not self.anchors:
            raise ValueError(
                "anchors must be set when ppu is true and model_format is "
                f"'{self.model_format.value}'. Copy the anchor table from the "
                "config the model was trained with, one group per feature-map "
                'layer separated by ";", in stride order 8, 16, 32.'
            )

        if self.anchors and not reads_anchors:
            raise ValueError(
                "anchors is only read when ppu is true and model_format is "
                f"'{ModelFormatEnum.anchor.value}'; every other decode path "
                "takes its box geometry from the model output. Remove it."
            )

        return self

    @model_validator(mode="after")
    def validate_model_format_matches_model_type(self):
        """Reject a model_format on a model_type that has no layout to pick:
        only yolo-generic has variants the decoder cannot tell apart, so a
        value on DAMO-YOLO's one fixed layout is a mistake, not a choice."""
        model_type = self.resolved_model_type

        if model_type is None or model_type is DeepxModelTypeEnum.yologeneric:
            return self

        if self.model_format is not ModelFormatEnum.auto:
            raise ValueError(
                "model_format is not used for model_type "
                f"{model_type.value} -- its output layout is fixed. "
                'Leave it as "auto".'
            )

        return self


class DeepxDetector(DetectionApi):
    type_key = DETECTOR_KEY
    runtime_manifest = DEEPX_MANIFEST

    def __init__(self, config: DeepxDetectorConfig):
        self.activate_dependencies()

        # DX-RT tries an abstract socket first, which never crosses a network
        # namespace, and only falls back after half a second of retries.
        # Naming the filesystem one up front skips that; dxrtd listens on both.
        os.environ.setdefault(DXRT_IPC_ENDPOINT_ENV, DXRT_IPC_SOCKET)
        satisfy_service_check(os.environ[DXRT_IPC_ENDPOINT_ENV])

        try:
            from dx_engine import InferenceEngine, InferenceOption
        except ModuleNotFoundError:
            raise ImportError(
                "The DX-RT python bindings are not installed. Frigate installs "
                "them at startup when a DEEPX detector is configured; check the "
                "startup log for errors."
            ) from None

        super().__init__(config)

        # model_type sits on the model, not the detector; a validator has
        # already rejected any value with no DEEPX decoder behind it.
        self.model_type = ModelTypeEnum(config.model.model_type.value)

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
        self.ppu = config.ppu
        self.model_format = config.model_format
        # validated above, and only non-empty for the decode that reads it
        self.anchors = parse_anchors(config.anchors) if config.anchors else {}
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
            # Config validation guarantees an anchor or anchor-free format
            # whenever ppu is true; PPU records give no other way to tell.
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
                self.anchors,
                self.width,
                self.height,
                self.score_threshold,
                self.nms_threshold,
            )

        if self.model_format in NMS_IN_HEAD_FORMATS:
            return decode_raw_nms_in_head(
                outputs, self.width, self.height, self.score_threshold
            )

        # Only single-output anchor heads need the dedicated decoder; a
        # multi-part output is feature maps the shared helper already reads.
        if self.model_format in ANCHOR_FORMATS and len(outputs) == 1:
            return decode_raw_anchor(
                outputs,
                self.width,
                self.height,
                self.score_threshold,
                self.nms_threshold,
            )

        # `auto` and an explicit `anchor_free` both read one tensor with no
        # objectness column, and the dedicated decoder keeps them honoring
        # this detector's own score_threshold and nms_threshold
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

        return post_process_yolo(
            outputs,
            self.width,
            self.height,
            self.score_threshold,
            self.nms_threshold,
        )

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

        A wrong guess at the compiled layout returns an empty detection array
        rather than failing, and these shapes are what tell those apart.
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
