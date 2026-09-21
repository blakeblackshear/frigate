"""DEEPX NPU detector running compiled .dxnn models via the DX-RT runtime."""

import json
import logging
import os
import re
import struct
from dataclasses import dataclass
from enum import Enum
from typing import Literal

import cv2
import numpy as np
from pydantic import ConfigDict, Field, field_validator

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum
from frigate.util.model import post_process_yolo, post_process_yolox
from frigate.util.runtime_deps import Artifact, ArtifactKind, RuntimeManifest

logger = logging.getLogger(__name__)

DETECTOR_KEY = "deepx"

# Installed at first start; DEEPX's PyPI wheels match the libdxrt-bin build.
DXRT_VERSION = "3.4.0"

# Where the host dxrtd accepts clients; a container cannot reach its abstract
# socket, and a mounted socket file pins a stale inode after a daemon restart.
DXRT_IPC_ENDPOINT_ENV = "DXRT_DYNAMIC_IPC_ENDPOINT"
DXRT_IPC_SOCKET = "/run/dxrt/dxrt_dynamic_ipc.sock"

# Pre-NMS filter; Frigate applies per-object min_score and threshold afterwards.
SCORE_THRESHOLD = 0.4
NMS_THRESHOLD = 0.4

# The device half of a `deepx:...` string, as the hardware probe writes it
DEVICE_INDEX = re.compile(r"(?:PCIe:)?(\d+)")

# YOLOX's raw head concatenates one cell per position of its three strides
YOLOX_STRIDES = (8, 16, 32)

# Fixed-width record the PPU emits, DeviceBoundingBox_t in DX-RT's
# datatype.h: x, y, w, h (float32), grid_y, grid_x, box_idx, layer_idx
# (uint8), score (float32), label (uint32), 4 bytes of padding.
PPU_RECORD_SIZE = 32
PPU_BOX_BYTES = (0, 16)
PPU_GRID_BYTES = (16, 20)
PPU_SCORE_BYTES = (20, 24)
PPU_LABEL_BYTES = (24, 28)

# Anchor sizes are in neither the PPU record nor the .dxnn, so a head is read
# against the table for its scale count: DEEPX's own reference decoder's, which
# every model it ships shares except YOLOv7.
PPU_ANCHORS_BY_SCALES = {
    2: np.array(
        [
            [[10, 14], [23, 27], [37, 58]],
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

# .dxnn: "DXNN", a 4-byte LE version, then a JSON index padded to
# DXNN_HEADER_SIZE; every offset in the index counts from there.
DXNN_MAGIC = b"DXNN"
DXNN_HEADER_SIZE = 8192
# The graph DX-COM keeps for visualisation, an ONNX ModelProto beside the
# encrypted model; only its nodes are read, for how the box tensor was built.
DXNN_GRAPH_SECTION = "vis_npu_models"
# Field numbers from onnx.proto
ONNX_GRAPH_FIELD = 7
ONNX_NODE_FIELD = 1
ONNX_NODE_FIELDS = {1: "input", 2: "output", 3: "name", 4: "op_type"}
# A YOLO head splits the DFL output into the two distances a box is built from
PPU_DISTANCE_OPS = ("Split", "Slice")
ONNX_WALK_LIMIT = 16
PPU_TYPE_ANCHOR_BASED = 0
PPU_TYPE_ANCHOR_FREE = 1
# The PPU tensor table, ppu_info_header_t then one ppu_info_t per output
# tensor, as DX-RT's ppu_binary_parser.h defines them.
PPU_TABLE_HEADER = struct.Struct("<BBBB")
PPU_TABLE_ENTRY = struct.Struct("<HHfBBBBBBBB")

# (N, 6) rows of corner box, score and class; the row count is what tells this
# from a raw head when a 1 or 2 class model also has 6 columns.
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
    """Resolve the NPU index from the device half of a `deepx:...` string: empty, a
    bare index, or `PCIe:<index>` as the hardware probe writes it."""
    if not configured:
        return 0

    # the whole string has to match: reading only the tail would take the 1 out
    # of "PCIe:0,PCIe:1" and silently bind to an NPU the config never named
    index = DEVICE_INDEX.fullmatch(configured.strip())

    if index is None:
        raise ValueError(
            f'"{configured}" is not an NPU index; expected a number or '
            '"PCIe:<number>". Run several NPUs by listing each one as its own '
            "devices entry, not by joining them into one string."
        )

    return int(index.group(1))


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
    yolox = "yolox"  # (N, 5+C) grid-relative offsets and log sizes, model_type yolox
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
    """Highest label id plus one, which bounds the classes even when ids are sparse."""
    if not labelmap:
        raise ValueError("the label map is empty; set labelmap_path")

    return max(labelmap) + 1


def _significant_dims(shape: tuple[int, ...]) -> list[int]:
    return [int(d) for d in shape if d != 1]


def infer_yolo_layout(
    shapes: list[tuple[int, ...]],
    num_classes: int,
    ppu: bool,
    dynamic_output: bool,
) -> YoloOutput:
    """Pick the decoder from the output shapes the runtime reports."""
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
    # a square output matches the same width on both axes, which is one layout
    layouts = {layout for _, layout in hits}

    if len(layouts) == 1:
        return YoloOutput(next(iter(layouts)), width)

    # 6 columns is both NMS-in-head and a 1 or 2 class raw head
    raw = next(layout for layout in layouts if layout is not YoloLayout.nms_in_head)
    if rows > NMS_IN_HEAD_MAX_ROWS:
        return YoloOutput(raw, width)

    return YoloOutput(YoloLayout.nms_in_head, width)


def _infer_multipart(shapes: list[tuple[int, ...]], num_classes: int) -> YoloOutput:
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
            "A two-tensor output is a DAMO-YOLO head, which this detector does "
            "not decode; otherwise export the model with its head included."
        )

    return YoloOutput(YoloLayout.multipart)


def validate_yolox_outputs(
    shapes: list[tuple[int, ...]], num_classes: int, width: int, height: int
) -> int:
    """Fail unless the shapes are YOLOX's raw (1, N, 5+C) head for this
    input size; returns the row width to orient a channel-major export."""
    columns = 5 + num_classes
    cells = sum((height // s) * (width // s) for s in YOLOX_STRIDES)
    dims = [_significant_dims(shape) for shape in shapes]

    if (
        len(dims) == 1
        and len(dims[0]) == 2
        and sorted(dims[0]) == sorted((cells, columns))
    ):
        return columns

    raise ValueError(
        f"output shapes {[tuple(shape) for shape in shapes]} are not YOLOX's "
        f"(1, {cells}, {columns}) raw head for a {width}x{height} input. Check "
        "that width and height match the compiled model, that labelmap_path "
        "matches it, usually /labelmap/coco-80.txt, and that model_type "
        "matches it; any other YOLO head needs model_type yolo-generic."
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


@dataclass(frozen=True)
class PpuLayout:
    """The PPU head's kind (None if unnamed), each scale's grid, finest first, and
    whether its boxes are a centre and size, as the compiled model states them."""

    anchor_based: bool | None
    grids: tuple[tuple[int, int], ...]
    centre_boxes: bool | None = None

    @property
    def scale_count(self) -> int:
        return len(self.grids)

    def strides(self, width: int) -> tuple[int, ...]:
        """One stride per scale, finest first, from the input width."""
        return tuple(round(width / grid_w) for grid_w, _ in self.grids)


def read_ppu_layout(path: str) -> PpuLayout | None:
    """Read the PPU head layout the compiler wrote into a .dxnn, or None when there
    is none to read."""
    try:
        with open(path, "rb") as model:
            header = model.read(DXNN_HEADER_SIZE)
            if header[:4] != DXNN_MAGIC:
                return None

            index = json.JSONDecoder().raw_decode(
                header[8:].decode("utf-8", "replace")
            )[0]
            data = index["data"]

            def section(entry: dict) -> bytes:
                model.seek(DXNN_HEADER_SIZE + int(entry["offset"]))
                return model.read(int(entry["size"]))

            anchor_based = None
            ppu = None
            if data.get("compile_config"):
                ppu = json.loads(section(data["compile_config"])).get("ppu")
                if ppu is None:
                    return None

                anchor_based = {
                    PPU_TYPE_ANCHOR_BASED: True,
                    PPU_TYPE_ANCHOR_FREE: False,
                }.get(ppu.get("type"))

            for chip in data.get("compiled_data", {}).values():
                for npu in chip.values():
                    # v8 has a PPU table; v7's output tensor shapes hold the same grids
                    if npu.get("ppu", {}).get("size"):
                        grids = _ppu_grids_from_table(section(npu["ppu"]))
                    elif npu.get("rmap_info", {}).get("size"):
                        outputs = json.loads(section(npu["rmap_info"])).get(
                            "outputs", []
                        )
                        grids = _ppu_grids_from_outputs(outputs, ppu)
                        if grids and anchor_based is None:
                            anchor_based = _ppu_outputs_are_anchor_based(outputs, ppu)
                    else:
                        continue

                    if not grids:
                        continue

                    scales = tuple(grids[k] for k in sorted(grids))
                    centre_boxes = None
                    bbox_node = _ppu_bbox_node(ppu)
                    if anchor_based is False and len(scales) == 1 and bbox_node:
                        nodes = []
                        try:
                            for entry in (data.get(DXNN_GRAPH_SECTION) or {}).values():
                                nodes += _onnx_nodes(section(entry))
                        except (OSError, ValueError, IndexError, KeyError, TypeError):
                            nodes = []

                        centre_boxes = ppu_boxes_are_centres(nodes, bbox_node)

                    return PpuLayout(anchor_based, scales, centre_boxes)

            return None
    except (
        OSError,
        ValueError,
        KeyError,
        IndexError,
        TypeError,
        AttributeError,
        struct.error,
    ):
        return None


def _ppu_grids_from_table(table: bytes) -> dict[int, tuple[int, int]]:
    _, tensor_count, _, _ = PPU_TABLE_HEADER.unpack_from(table)
    if len(table) < PPU_TABLE_HEADER.size + tensor_count * PPU_TABLE_ENTRY.size:
        raise ValueError("PPU table shorter than its tensor count")

    grids: dict[int, tuple[int, int]] = {}
    for i in range(tensor_count):
        fields = PPU_TABLE_ENTRY.unpack_from(
            table, PPU_TABLE_HEADER.size + i * PPU_TABLE_ENTRY.size
        )
        grids.setdefault(fields[3], (fields[8], fields[9]))

    return grids


def _ppu_output_scale(name: str, ppu: dict | None) -> int | None:
    entry = ((ppu or {}).get("outputs") or {}).get(name)
    if isinstance(entry, dict) and "conv_idx" in entry:
        return int(entry["conv_idx"])

    match = re.fullmatch(r"PPU_\w*?Output_(\d+)(?:_anchor_\d+)?", name)
    return int(match.group(1)) if match else None


def _ppu_grids_from_outputs(
    outputs: list[dict], ppu: dict | None
) -> dict[int, tuple[int, int]]:
    grids: dict[int, tuple[int, int]] = {}
    for output in outputs:
        scale = _ppu_output_scale(str(output.get("name", "")), ppu)
        shape = output.get("shape") or []
        if scale is None or len(shape) not in (3, 4):
            continue

        grid = (int(shape[2]), int(shape[1])) if len(shape) == 4 else (int(shape[1]), 1)
        grids.setdefault(scale, grid)

    return grids


def _ppu_outputs_are_anchor_based(outputs: list[dict], ppu: dict | None) -> bool | None:
    mapping = (ppu or {}).get("outputs") or {}
    if any(
        isinstance(entry, dict) and "anchor_idx" in entry for entry in mapping.values()
    ):
        return True

    if any("_anchor_" in str(output.get("name", "")) for output in outputs):
        return True

    return None


def _ppu_bbox_node(ppu: dict | None) -> str | None:
    layers = (ppu or {}).get("layer")
    if not isinstance(layers, list) or len(layers) != 1:
        return None

    layer = layers[0]
    return layer.get("bbox") if isinstance(layer, dict) else None


def _proto_varint(blob: bytes, at: int) -> tuple[int, int]:
    value = shift = 0
    while True:
        byte = blob[at]
        at += 1
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value, at

        shift += 7


def _proto_fields(blob: bytes):
    at = 0
    while at < len(blob):
        key, at = _proto_varint(blob, at)
        field, wire = key >> 3, key & 7
        if wire == 0:
            _, at = _proto_varint(blob, at)
        elif wire == 2:
            size, at = _proto_varint(blob, at)
            yield field, blob[at : at + size]
            at += size
        elif wire == 5:
            at += 4
        elif wire == 1:
            at += 8
        else:
            raise ValueError(f"unknown protobuf wire type {wire}")


def _onnx_nodes(blob: bytes) -> list[dict]:
    nodes = []
    for field, graph in _proto_fields(blob):
        if field != ONNX_GRAPH_FIELD:
            continue

        for graph_field, node in _proto_fields(graph):
            if graph_field != ONNX_NODE_FIELD:
                continue

            entry = {"input": [], "output": [], "name": "", "op_type": ""}
            for node_field, value in _proto_fields(node):
                key = ONNX_NODE_FIELDS.get(node_field)
                if key is None:
                    continue

                text = value.decode("utf-8", "replace")
                if key in ("input", "output"):
                    entry[key].append(text)
                else:
                    entry[key] = text

            nodes.append(entry)

    return nodes


def _upstream_concat(node: dict | None, producers: dict) -> dict | None:
    seen: set[str] = set()
    queue = [node] if node else []
    while queue and len(seen) <= ONNX_WALK_LIMIT:
        current = queue.pop(0)
        if current["op_type"] == "Concat":
            return current

        for name in current["input"]:
            if name in seen:
                continue

            seen.add(name)
            producer = producers.get(name)
            if producer is not None:
                queue.append(producer)

    return None


def _box_tensor_sources(producers: dict, tensor: str) -> set[str]:
    sources: set[str] = set()
    seen: set[str] = set()
    pending = [(tensor, 0)]
    while pending:
        name, depth = pending.pop()
        if name in seen:
            continue

        seen.add(name)
        node = producers.get(name)
        if (
            node is None
            or depth >= ONNX_WALK_LIMIT
            or node["op_type"] in PPU_DISTANCE_OPS
        ):
            sources.add(name)
            continue

        pending += [(read, depth + 1) for read in node["input"]]

    return sources


def ppu_boxes_are_centres(nodes: list[dict], bbox_node: str) -> bool | None:
    """Whether the PPU's box tensor holds a centre and size rather than two
    corners, read from how the compiled graph built it. A YOLO head turns
    the two DFL distances into corners as (anchor - left, anchor + right),
    one distance per half, or into a centre and size as their mean and
    their difference, both halves drawing on both distances. None when the
    graph is not there or built the boxes some other way; nothing here
    reads a node's name, only the shape of the graph around it."""
    producers = {out: node for node in nodes for out in node["output"]}
    by_name = {node["name"]: node for node in nodes}

    concat = _upstream_concat(by_name.get(bbox_node), producers)
    if concat is None or len(concat["input"]) != 2:
        return None

    first, second = (_box_tensor_sources(producers, t) for t in concat["input"])
    distances = {
        tensor
        for tensor in first | second
        if producers.get(tensor, {}).get("op_type") in PPU_DISTANCE_OPS
    }
    if len(distances) != 2:
        return None

    first &= distances
    second &= distances
    if first == second == distances:
        return True

    if first != second and len(first) == len(second) == 1:
        return False

    return None


def ppu_grid_regression_geometry(
    records: np.ndarray, boxes: np.ndarray, strides: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Pixel centre and size for a YOLOX-style grid-relative box: centre
    offset from the grid cell, size a log-scale multiple of the stride.
    `strides` is one per scale, finest first."""
    grid = reinterpret(records, PPU_GRID_BYTES, np.uint8)
    grid_y = grid[:, 0].astype(np.float32)
    grid_x = grid[:, 1].astype(np.float32)
    layer_idx = grid[:, 3].astype(np.int32)

    known = layer_idx < len(strides)
    layer = np.where(known, layer_idx, 0)
    stride = strides[layer]

    centre_x = (boxes[:, 0] + grid_x) * stride
    centre_y = (boxes[:, 1] + grid_y) * stride
    box_w = np.exp(boxes[:, 2]) * stride
    box_h = np.exp(boxes[:, 3]) * stride

    return centre_x, centre_y, box_w, box_h, known


def ppu_anchor_geometry(
    records: np.ndarray, boxes: np.ndarray, strides: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Pixel centre and size for anchor-based PPU records, with the mask of
    records the anchor table covers. `strides` is one per scale, finest
    first; a scale count with no table leaves every record unplaced."""
    grid = reinterpret(records, PPU_GRID_BYTES, np.uint8)
    grid_y = grid[:, 0].astype(np.float32)
    grid_x = grid[:, 1].astype(np.float32)
    box_idx = grid[:, 2].astype(np.int32)
    layer_idx = grid[:, 3].astype(np.int32)

    anchor_table = PPU_ANCHORS_BY_SCALES.get(len(strides))
    if anchor_table is None:
        zeros = np.zeros(len(layer_idx), np.float32)
        return zeros, zeros, zeros, zeros, np.zeros(len(layer_idx), dtype=bool)

    levels, per_level = anchor_table.shape[:2]
    known = (layer_idx < levels) & (box_idx < per_level)

    # fold the out-of-range rows onto a real entry and let the mask drop them
    layer = np.where(known, layer_idx, 0)
    anchors = anchor_table[layer, np.where(known, box_idx, 0)]
    stride = strides[layer]

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
    *,
    strides: tuple[int, ...] | np.ndarray,
    anchor_based: bool,
    centre_boxes: bool = False,
    records: np.ndarray | None = None,
) -> np.ndarray:
    """Decode PPU records, leaving only NMS. `strides` is one per scale,
    finest first."""
    if records is None:
        records = ppu_records(outputs)

    if records is None:
        return np.zeros((20, 6), np.float32)

    boxes = reinterpret(records, PPU_BOX_BYTES, np.float32).reshape(-1, 4)
    scores = reinterpret(records, PPU_SCORE_BYTES, np.float32).flatten()
    labels = reinterpret(records, PPU_LABEL_BYTES, np.uint32).flatten()
    strides = np.asarray(strides, np.float32)

    if anchor_based:
        centre_x, centre_y, box_w, box_h, known = ppu_anchor_geometry(
            records, boxes, strides
        )
        # a record the table cannot place is dropped by the score filter
        scores = np.where(known, scores, 0.0)
        x_min, y_min = centre_x - box_w * 0.5, centre_y - box_h * 0.5
    elif len(strides) > 1:
        # a multi-scale anchor-free head is YOLOX-style, grid-relative
        centre_x, centre_y, box_w, box_h, known = ppu_grid_regression_geometry(
            records, boxes, strides
        )
        scores = np.where(known, scores, 0.0)
        x_min, y_min = centre_x - box_w * 0.5, centre_y - box_h * 0.5
    elif centre_boxes:
        box_w, box_h = boxes[:, 2], boxes[:, 3]
        x_min, y_min = boxes[:, 0] - box_w * 0.5, boxes[:, 1] - box_h * 0.5
    else:
        # the head wrote two corners, so its edges are the answer already
        x_min, y_min = boxes[:, 0], boxes[:, 1]
        box_w, box_h = boxes[:, 2] - x_min, boxes[:, 3] - y_min

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
    """Decode an anchor-based head: (N, 5+C) rows of cx, cy, w, h, objectness and
    class scores in pixels, transposed when `columns` says so."""
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


class DeepxDetector(DetectionApi):
    """DEEPX NPU detector: DX-RT session plus the decoder the model needs."""

    type_key = DETECTOR_KEY
    runtime_manifest = DEEPX_MANIFEST
    supported_models = [ModelTypeEnum.yologeneric, ModelTypeEnum.yolox]

    def __init__(self, config: DeepxDetectorConfig):
        # before the runtime is installed or the socket is looked for: this
        # needs no hardware, and ssd, the default, would otherwise be decoded
        # as YOLO and return nonsense rather than an error
        if config.model.model_type not in self.supported_models:
            supported = ", ".join(t.value for t in self.supported_models)
            raise ValueError(
                f"model_type '{config.model.model_type.value}' is not supported "
                f"by the DEEPX detector. Set model.model_type to one of: "
                f"{supported}."
            )

        self.activate_dependencies()

        # skip DX-RT's abstract-socket attempt, which cannot leave the container
        if not os.environ.get(DXRT_IPC_ENDPOINT_ENV):
            os.environ[DXRT_IPC_ENDPOINT_ENV] = DXRT_IPC_SOCKET
        endpoint = os.environ[DXRT_IPC_ENDPOINT_ENV]

        if not endpoint.startswith("@") and not os.path.exists(endpoint):
            # DX-RT reports this as a bare connect error several layers down
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

        # SERVICE gates only DX-RT's /proc scan for dxrtd, which a container
        # cannot do for the host; the IPC client still needs the socket
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
        if self.output.layout is YoloLayout.yolox:
            self.calculate_grids_strides()
        self.logged_layout = False
        self.ppu_unsupported_scale_reported = False

        self.ppu_layout: PpuLayout | None = None
        self.ppu_strides: np.ndarray | None = None
        if self.output.layout is YoloLayout.ppu:
            self.ppu_layout = self.inspect_ppu_head(model_path)
            self.ppu_strides = np.asarray(
                self.ppu_layout.strides(self.width), np.float32
            )

    def inspect_ppu_head(self, model_path: str) -> PpuLayout:
        """Read the PPU head layout DX-COM writes into the model file."""
        layout = read_ppu_layout(model_path)

        if layout is None:
            raise ValueError(
                f"Could not read the PPU head layout from {model_path}; the "
                "file is damaged or was compiled before DX-COM 2.4.0. Compile "
                "PPU models with DX-COM 2.4.0 or later."
            )

        if layout.anchor_based is None:
            raise ValueError(
                f"The PPU head in {model_path} names no kind Frigate can decode "
                "(anchor-based or anchor-free YOLO); face and pose PPU models are "
                "not supported, and PPU models must be compiled with DX-COM 2.4.0 "
                "or later."
            )

        if (
            layout.anchor_based is False
            and layout.scale_count == 1
            and layout.centre_boxes is None
        ):
            # both readings are plausible geometry, so only the graph can settle it
            raise ValueError(
                f"Could not tell from {model_path} whether its PPU head writes "
                "boxes as a centre and size or as two corners. The compiled "
                "graph that says so is missing from the file or builds its "
                "boxes in a way Frigate does not recognise. Compile PPU models "
                "with DX-COM 2.4.0 or later."
            )

        logger.info(
            "DEEPX PPU head from the model: %s, %d scale(s), grids %s%s",
            "anchor-based" if layout.anchor_based else "anchor-free",
            layout.scale_count,
            layout.grids,
            ""
            if layout.centre_boxes is None
            else (
                ", boxes as a centre and size"
                if layout.centre_boxes
                else ", boxes as two corners"
            ),
        )
        return layout

    def inspect_model(self, config: DeepxDetectorConfig) -> YoloOutput:
        """Pick the decoder from what the runtime reports, failing here rather than
        on the first frame."""
        shapes = [
            tuple(info["shape"]) for info in self.session.get_output_tensors_info()
        ]

        try:
            num_classes = class_count(config.model.merged_labelmap)

            if self.model_type == ModelTypeEnum.yolox and not self.session.is_ppu():
                # a YOLOX compiled with PPU support is read as PPU below
                columns = validate_yolox_outputs(
                    shapes, num_classes, self.width, self.height
                )
                output = YoloOutput(YoloLayout.yolox, columns)
            else:
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
            "DEEPX decoding %s output as %s with %d classes",
            self.model_type.value,
            output.layout.value,
            num_classes,
        )
        return output

    def decode(self, outputs: list[np.ndarray]) -> np.ndarray:
        """Decode the model output according to its type and detected layout."""
        match self.output.layout:
            case YoloLayout.ppu:
                return self.decode_ppu(outputs)
            case YoloLayout.yolox:
                return self.decode_yolox(outputs)
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
                rows = rows_with_columns(outputs[0], self.output.columns)
                return post_process_yolo([rows], self.width, self.height)
            case YoloLayout.nms_in_head:
                return decode_raw_nms_in_head(
                    outputs, self.width, self.height, SCORE_THRESHOLD
                )
            case _:
                return post_process_yolo(outputs, self.width, self.height)

    def decode_yolox(self, outputs: list[np.ndarray]) -> np.ndarray:
        """Decode YOLOX's raw head with Frigate's shared decoder."""
        rows = rows_with_columns(outputs[0], self.output.columns)
        predictions = np.array(rows, dtype=np.float32).reshape(1, -1, rows.shape[-1])

        return post_process_yolox(
            predictions, self.width, self.height, self.grids, self.expanded_strides
        )

    def decode_ppu(self, outputs: list[np.ndarray]) -> np.ndarray:
        """Decode PPU records against the head layout read from the model."""
        layout = self.ppu_layout
        assert layout is not None

        records = ppu_records(outputs)

        if (
            layout.anchor_based
            and layout.scale_count not in PPU_ANCHORS_BY_SCALES
            and not self.ppu_unsupported_scale_reported
        ):
            self.ppu_unsupported_scale_reported = True
            logger.error(
                "This PPU model's anchor-based head reports %d detection "
                "scales, which Frigate has no anchor table for (supported: "
                "%s); its detections cannot be decoded",
                layout.scale_count,
                ", ".join(str(n) for n in sorted(PPU_ANCHORS_BY_SCALES)),
            )

        return decode_ppu(
            outputs,
            self.width,
            self.height,
            SCORE_THRESHOLD,
            NMS_THRESHOLD,
            strides=self.ppu_strides,
            anchor_based=bool(layout.anchor_based),
            centre_boxes=bool(layout.centre_boxes),
            records=records,
        )

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
