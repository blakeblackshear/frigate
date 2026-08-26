"""DEEPX NPU detector running compiled .dxnn models via the DX-RT runtime."""

import glob
import logging
import os
from enum import Enum
from typing import Literal

import cv2
import numpy as np
from pydantic import ConfigDict, Field, model_validator

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum
from frigate.util.model import post_process_yolo

logger = logging.getLogger(__name__)

DETECTOR_KEY = "deepx"

# PPU-compiled models still use yolo-generic in the config; the `ppu` option is
# what selects the decode path, since ModelTypeEnum has no PPU-specific value.
supported_models = [ModelTypeEnum.yologeneric]

DXNN_DEVICES_ENV = "DXNN_DEVICES"


class ModelFormatEnum(str, Enum):
    """The YOLO variant a .dxnn file was compiled from.

    DX-COM preserves the detection head of the source model, so the variant
    determines how the output has to be read. Three families exist, and every
    supported variant belongs to exactly one of them.
    """

    yolov5 = "yolov5"
    yolov7 = "yolov7"
    yolov8 = "yolov8"
    yolov9 = "yolov9"
    yolov10 = "yolov10"
    yolov11 = "yolov11"
    yolov12 = "yolov12"
    yolov26 = "yolov26"


# Anchor-based heads. Raw output is (N, 5+C) with a separate objectness column,
# and the box columns hold sigmoid activations that must be rescaled against the
# grid cell and anchor that produced them.
ANCHOR_FORMATS = frozenset(
    {
        ModelFormatEnum.yolov5,
        ModelFormatEnum.yolov7,
    }
)

# Anchor-free heads. Raw output is (4+C, N) channel-major with no objectness
# column, and the box columns are already in input pixels.
ANCHOR_FREE_FORMATS = frozenset(
    {
        ModelFormatEnum.yolov8,
        ModelFormatEnum.yolov9,
        ModelFormatEnum.yolov11,
        ModelFormatEnum.yolov12,
    }
)

# Heads that run NMS on-device and emit final boxes as (N, 6) corner records.
# DX-COM cannot compile these with PPU support.
NMS_IN_HEAD_FORMATS = frozenset(
    {
        ModelFormatEnum.yolov10,
        ModelFormatEnum.yolov26,
    }
)

# Anchor table for YOLOv5/YOLOv7 PPU models, keyed by stride.
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


def resolve_devices(configured: list[int] | None) -> list[int]:
    """Resolve which NPU device indices this detector should bind to."""
    if configured:
        return configured

    env_value = os.environ.get(DXNN_DEVICES_ENV)

    if env_value:
        try:
            devices = [int(d.strip()) for d in env_value.split(",") if d.strip()]
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
    boxes_xywh = np.column_stack([x_min, y_min, box_w, box_h])
    indices = cv2.dnn.NMSBoxes(
        boxes_xywh.tolist(), scores.tolist(), score_threshold, nms_threshold
    )

    if len(indices) == 0:
        return np.empty(0, dtype=np.int32)

    return np.array(indices).reshape(-1)


def decode_yolo_ppu_anchor(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
    nms_threshold: float,
) -> np.ndarray:
    """Decode PPU output from an anchor-based head (YOLOv5, YOLOv7).

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

    # YOLOv5-style anchor decode: the model emits sigmoid outputs that are
    # rescaled against the grid cell and its anchor to recover pixel geometry.
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


def decode_yolo_ppu_anchor_free(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
    nms_threshold: float,
) -> np.ndarray:
    """Decode PPU output from an anchor-free head (YOLOv8, v9, v11, v12).

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


def decode_yolo_raw_anchor(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
    nms_threshold: float,
) -> np.ndarray:
    """Decode raw output from an anchor-based head (YOLOv5, YOLOv7).

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


def decode_yolo_raw_nms_in_head(
    outputs: list[np.ndarray],
    width: int,
    height: int,
    score_threshold: float,
) -> np.ndarray:
    """Decode raw output from a head that already ran NMS (YOLOv10, YOLOv26).

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


class DeepxDetectorConfig(BaseDetectorConfig):
    """DEEPX NPU detector running .dxnn models via the DX-RT runtime."""

    model_config = ConfigDict(title="DEEPX NPU")

    type: Literal[DETECTOR_KEY]
    device_ids: list[int] | None = Field(
        default=None,
        title="DEEPX device indices",
        description="NPU device indices this detector should bind to. Defaults "
        "to auto-detection via the DXNN_DEVICES environment variable, then the "
        "DX-RT device count, then a scan of /dev/dxrt*.",
    )
    ppu: bool = Field(
        default=False,
        title="PPU-compiled model",
        description="Set to true when the model was compiled with DEEPX's "
        "Post-Processing Unit support, which moves candidate selection onto "
        "the NPU and changes the output format.",
    )
    model_format: ModelFormatEnum | None = Field(
        default=None,
        title="YOLO variant the model was compiled from",
        description="Selects how the model's output is decoded. Leave unset to "
        "infer the layout from the output shape, which cannot tell an "
        "anchor-based head from an anchor-free one and is only reliable for "
        "YOLOv8 and newer. Required when ppu is true, since a PPU record's "
        "layout is identical for every variant and cannot be inferred.",
    )
    score_threshold: float = Field(
        default=0.25,
        title="Score threshold used when decoding detector output",
    )
    nms_threshold: float = Field(
        default=0.45,
        title="NMS IoU threshold used when decoding detector output",
    )

    @model_validator(mode="after")
    def validate_ppu_is_supported(self):
        """Reject a PPU/format pairing DX-COM cannot produce."""
        if self.ppu and self.model_format in NMS_IN_HEAD_FORMATS:
            raise ValueError(
                f"model_format '{self.model_format.value}' runs NMS in the "
                "detection head and cannot be compiled with PPU support by "
                "DX-COM. Set ppu to false."
            )

        return self

    @model_validator(mode="after")
    def validate_ppu_requires_model_format(self):
        """Reject an unset model_format when ppu is enabled.

        A PPU record is the same fixed-width layout for every variant, so
        unlike the raw output path there is no shape to infer the layout
        from. Leaving model_format unset here used to silently default to
        the anchor-based decoder, which corrupts detections from anchor-free
        PPU models (e.g. YOLOv8) instead of failing loudly.
        """
        if self.ppu and self.model_format is None:
            raise ValueError(
                "model_format must be set when ppu is true. The PPU output "
                "layout can't be inferred, and guessing wrong silently "
                "corrupts detections."
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

        if config.model.model_type not in supported_models:
            raise ValueError(
                f'Model type "{config.model.model_type}" is not supported by the '
                "deepx detector"
            )

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

        logger.info(
            "DEEPX decoding %s output as %s",
            "PPU" if self.ppu else "raw",
            self.model_format.value if self.model_format else "auto-detected",
        )

    def decode(self, outputs: list[np.ndarray]) -> np.ndarray:
        """Decode raw or PPU output according to the configured YOLO variant."""
        if self.ppu:
            # Config validation guarantees model_format is set to an anchor
            # or anchor-free format whenever ppu is true, since PPU records
            # give no other way to tell the two apart.
            if self.model_format in ANCHOR_FREE_FORMATS:
                return decode_yolo_ppu_anchor_free(
                    outputs,
                    self.width,
                    self.height,
                    self.score_threshold,
                    self.nms_threshold,
                )

            return decode_yolo_ppu_anchor(
                outputs,
                self.width,
                self.height,
                self.score_threshold,
                self.nms_threshold,
            )

        if self.model_format in NMS_IN_HEAD_FORMATS:
            return decode_yolo_raw_nms_in_head(
                outputs, self.width, self.height, self.score_threshold
            )

        # Only single-output anchor heads need the dedicated decoder. A
        # multi-part output is a set of raw feature maps, which the shared
        # helper already decodes with the same anchor formula.
        if self.model_format in ANCHOR_FORMATS and len(outputs) == 1:
            return decode_yolo_raw_anchor(
                outputs,
                self.width,
                self.height,
                self.score_threshold,
                self.nms_threshold,
            )

        return post_process_yolo(outputs, self.width, self.height)

    def detect_raw(self, tensor_input):
        outputs = self.session.run([tensor_input])

        if not isinstance(outputs, list):
            outputs = [outputs]

        return self.decode(outputs)
