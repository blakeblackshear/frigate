"""Frigate detector plugin: raw-head YOLO on an AMD XDNA NPU via the Vitis AI EP.

It serves both models:

  family: nas  -> yolonas_s_xint8_c200.onnx   (6 raw head outputs, 17 DFL bins)
  family: v8   -> yolov8s_xint8_c200.onnx     (2 raw head outputs, 16 DFL bins)

Neither model has NMS or a decode head baked in, so Frigate's built-in
`yolonas` / `yologeneric` post-processors do NOT fit them. The decode lives
here instead.

Frigate contract implemented below:
  * `detect_raw(tensor_input)` receives one already-resized square crop,
    shape [1,3,640,640], float32, RGB, values in 0..1
    (set input_tensor: nchw / input_pixel_format: rgb / input_dtype: float).
  * it returns np.ndarray shape (20, 6), rows are
    [class_id, score, y_min, x_min, y_max, x_max] with coords normalised 0..1.
  * Frigate sends a SQUARE crop, so there is no letterbox and no padding to
    undo: box/640 is already the normalised coordinate.

Config example (frigate.yml):

    models:
      - path: /config/models/yolov8s_xint8_c200.onnx
        labelmap_path: /config/models/labelmap_coco80.txt
        width: 640
        height: 640
        input_tensor: nchw
        input_pixel_format: rgb
        input_dtype: float
        devices:
          - vitisai
"""

import json
import logging
import os
import shutil
import tempfile
from typing import Literal

import numpy as np
import onnxruntime as ort
from pydantic import ConfigDict, Field

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

logger = logging.getLogger(__name__)

DETECTOR_KEY = "vitisai"
MAX_DETECTIONS = 20  # Frigate's fixed output height
# kept next to the compiled model, since a cache hit writes no partition report
SAVED_REPORT = "frigate_partition_report.json"


class VitisAIDetectorConfig(BaseDetectorConfig):
    """Raw-head YOLO on an AMD XDNA NPU through the Vitis AI execution provider."""

    model_config = ConfigDict(title="Vitis AI (AMD XDNA NPU)")

    type: Literal[DETECTOR_KEY]
    family: Literal["auto", "nas", "v8"] = Field(
        default="auto",
        description="Head layout: 'nas' for YOLO-NAS-S (6 outputs), 'v8' for YOLOv8 (2 outputs), 'auto' to pick from the model's output count.",
    )
    target: str = Field(
        default="X1", description="X1 = Phoenix/XDNA 1, X2 = Strix/XDNA 2."
    )
    xclbin: str = Field(
        default="/opt/xilinx/xclbins/phoenix/4x4.xclbin",
        description="Absolute path to the overlay, e.g. .../phoenix/4x4.xclbin.",
    )
    cache_dir: str = Field(
        default="/config/model_cache/vaip", description="Persistent compiler cache."
    )
    cache_key: str = Field(
        default="",
        description="Cache subdirectory name; defaults to the model basename.",
    )
    config_file: str = Field(default="", description="Optional vaip_config.json path.")
    py3_round: bool = Field(
        default=False,
        description="MUST stay false on Phoenix. True restores the default rounding and "
        "silently drops the whole graph to the CPU.",
    )
    require_npu: bool = Field(
        default=True,
        description="Abort startup instead of silently serving detections from the CPU.",
    )
    conf: float = Field(default=0.4, description="Score threshold applied before NMS.")
    iou: float = Field(default=0.5, description="IoU threshold for class-aware NMS.")


class VitisAIDetector(DetectionApi):
    type_key = DETECTOR_KEY

    def __init__(self, detector_config: VitisAIDetectorConfig):
        super().__init__(detector_config)

        self.family = detector_config.family
        self.conf = detector_config.conf
        self.iou = detector_config.iou
        model_path = detector_config.model.path

        # The EP writes its partition report here. It is the only cheap way to
        # learn, in-process, whether any compute actually landed on the DPU.
        report_path = os.path.join(
            tempfile.gettempdir(), f"vitisai_report_{os.getpid()}.json"
        )
        os.environ["XLNX_ONNX_EP_REPORT_FILE"] = report_path

        cache_key = (
            detector_config.cache_key
            or os.path.splitext(os.path.basename(model_path))[0]
        )
        popts = {
            "target": detector_config.target,
            "cache_dir": detector_config.cache_dir,
            "cache_key": cache_key,
            "enable_cache_file_io_in_mem": "0",
        }
        # Without this the partitioner accepts the graph and then runs all of it
        # on the CPU, with no error anywhere. Non-negotiable on Phoenix.
        if not detector_config.py3_round:
            popts["xlnx_enable_py3_round"] = 0
        if detector_config.xclbin:
            popts["xclbin"] = detector_config.xclbin
        if detector_config.config_file:
            popts["config_file"] = detector_config.config_file

        os.makedirs(detector_config.cache_dir, exist_ok=True)
        cache_path = os.path.join(detector_config.cache_dir, cache_key)
        saved_report = os.path.join(cache_path, SAVED_REPORT)

        logger.info(
            "VitisAI: compiling %s (first run takes 20-60s, cached in %s)",
            model_path,
            cache_path,
        )
        self.ort = self._create_session(model_path, popts, report_path)
        report = self._read_report(report_path)

        if report is None and not os.path.exists(saved_report):
            # A cache written without a saved report can't be checked, so
            # compile once more to get one.
            logger.info("VitisAI: no partition report for %s, recompiling", cache_path)
            del self.ort
            shutil.rmtree(cache_path, ignore_errors=True)
            self.ort = self._create_session(model_path, popts, report_path)
            report = self._read_report(report_path)

        if report is None:
            report = self._read_report(saved_report)
        elif os.path.isdir(cache_path):
            shutil.copyfile(report_path, saved_report)

        self.input_name = self.ort.get_inputs()[0].name
        self.output_names = [o.name for o in self.ort.get_outputs()]
        self._resolve_family()

        self._check_dispatch(report, detector_config.require_npu)
        self._build_anchors()

        # Warm up inside __init__ so Frigate's detector watchdog does not see a
        # multi-second first inference and kill the process.
        shape = (1, 3, self.height, self.width)
        self.detect_raw(np.zeros(shape, dtype=np.float32))
        logger.info("VitisAI: %s ready", model_path)

    # ------------------------------------------------------------------ setup

    @staticmethod
    def _create_session(
        model_path: str, popts: dict, report_path: str
    ) -> ort.InferenceSession:
        """Create the NPU session, removing any report left by an earlier one."""
        if os.path.exists(report_path):
            os.remove(report_path)

        so = ort.SessionOptions()
        so.log_severity_level = 3
        return ort.InferenceSession(
            model_path,
            sess_options=so,
            providers=["VitisAIExecutionProvider"],
            provider_options=[popts],
        )

    @staticmethod
    def _read_report(path: str) -> dict | None:
        """Load a partition report, or None if there is none to load."""
        try:
            with open(path) as fh:
                return json.load(fh)
        except FileNotFoundError:
            return None
        except (OSError, ValueError) as exc:
            logger.warning("VitisAI: could not read partition report %s: %s", path, exc)
            return None

    def _resolve_family(self) -> None:
        """Pick the head layout from the output count when family is 'auto'."""
        if self.family != "auto":
            return

        heads = {6: "nas", 2: "v8"}.get(len(self.output_names))

        if heads is None:
            raise ValueError(
                f"Cannot tell the YOLO head layout from {len(self.output_names)} model outputs"
            )

        self.family = heads

    def _check_dispatch(self, report: dict | None, require_npu: bool) -> None:
        """Fail loudly on a silent CPU fallback.

        `providers` says VitisAIExecutionProvider even when nothing runs on the
        NPU, so it proves nothing. The two signals that do are the NPU bucket's
        node count and whether `Conv` is in it: a partition of only Concat and
        Q/DQ glue nodes still takes a hardware context but computes nothing.
        """
        npu_nodes, all_nodes, ops = 0, 0, []
        for dev in (report or {}).get("deviceStat", []):
            name = dev.get("name")
            if name == "all":
                all_nodes = dev.get("nodeNum", 0)
            elif name == "NPU":
                npu_nodes = dev.get("nodeNum", 0)
                ops = [o.strip(":") for o in dev.get("supportedOpType", [])]

        conv_on_npu = "Conv" in ops
        msg = (
            f"VitisAI: {npu_nodes}/{all_nodes} nodes on the NPU, "
            f"Conv on NPU: {conv_on_npu}"
        )
        if npu_nodes and conv_on_npu:
            logger.info(msg)
            return

        logger.error(
            "%s -- this is a SILENT CPU FALLBACK. Check that xlnx_enable_py3_round "
            "is 0, that the xclbin matches the installed firmware, and that the "
            "model is XINT8 (A8W8/A16W8/BF16 never reach the DPU on Phoenix).",
            msg,
        )
        if require_npu:
            raise RuntimeError(f"NPU dispatch failed: {msg}")

    def _build_anchors(self) -> None:
        """Anchor centres and strides, in the concat order the heads emit."""
        self.levels = []
        for stride in (8, 16, 32):
            size = self.width // stride
            yy, xx = np.meshgrid(
                np.arange(size, dtype=np.float32) + 0.5,
                np.arange(size, dtype=np.float32) + 0.5,
                indexing="ij",
            )
            self.levels.append((stride, xx.ravel(), yy.ravel()))
        self.gx = np.concatenate([lv[1] for lv in self.levels])
        self.gy = np.concatenate([lv[2] for lv in self.levels])
        self.gs = np.concatenate(
            [np.full(lv[1].size, lv[0], dtype=np.float32) for lv in self.levels]
        )

    # ------------------------------------------------------------ inference

    def detect_raw(self, tensor_input: np.ndarray):
        outputs = self.ort.run(
            None, {self.input_name: np.ascontiguousarray(tensor_input)}
        )
        if self.family == "v8":
            boxes, scores, classes = self._decode_v8(outputs)
        else:
            boxes, scores, classes = self._decode_nas(outputs)
        return self._to_frigate(boxes, scores, classes)

    @staticmethod
    def _softmax_expect(logits: np.ndarray, bins: int) -> np.ndarray:
        """DFL: per-side softmax over `bins`, then its expected value. -> [4, N]"""
        logits = logits - logits.max(axis=1, keepdims=True)
        prob = np.exp(logits)
        prob /= prob.sum(axis=1, keepdims=True)
        grid = np.arange(bins, dtype=np.float32)[None, :, None]
        return (prob * grid).sum(axis=1)

    def _decode_v8(self, outputs):
        """YOLOv8 raw head: box [1,64,8400] DFL logits, cls [1,80,8400] logits.

        DFL distances come out in GRID units and are multiplied by the stride.
        """
        box = next(o for o in outputs if o.shape[1] == 64)[0]
        cls = next(o for o in outputs if o.shape[1] == 80)[0]
        n = box.shape[1]

        scores_all = 1.0 / (1.0 + np.exp(-cls.T))  # [N, 80]
        best = scores_all.max(axis=1)
        keep = best > self.conf
        if not keep.any():
            return None, None, None

        dist = self._softmax_expect(box.reshape(4, 16, n)[:, :, keep], 16)
        gx, gy, gs = self.gx[keep], self.gy[keep], self.gs[keep]
        boxes = np.stack(
            [
                (gx - dist[0]) * gs,
                (gy - dist[1]) * gs,
                (gx + dist[2]) * gs,
                (gy + dist[3]) * gs,
            ],
            axis=1,
        )
        return boxes, best[keep], scores_all[keep].argmax(axis=1)

    def _decode_nas(self, outputs):
        """YOLO-NAS raw head: per level cls [1,80,H,W] and reg [1,68,H,W].

        68 = 4 sides x 17 DFL bins, and the distances are already in PIXELS of
        the level, so they are multiplied by the stride, not by grid units.
        Levels are paired by spatial size (80x80 -> s8, 40x40 -> s16, 20x20 -> s32).
        """
        by_size = {}
        for arr in outputs:
            a = arr[0]
            by_size.setdefault(a.shape[-1] * a.shape[-2], {})[
                "cls" if a.shape[0] == 80 else "reg"
            ] = a

        boxes_l, scores_l = [], []
        for stride, gx, gy in self.levels:
            level = by_size.get((self.width // stride) ** 2)
            if not level or "cls" not in level or "reg" not in level:
                continue
            cls, reg = level["cls"], level["reg"]
            n = cls.shape[1] * cls.shape[2]
            dist = self._softmax_expect(reg.reshape(4, 17, n), 17) * stride
            ax, ay = gx * stride, gy * stride
            boxes_l.append(
                np.stack(
                    [ax - dist[0], ay - dist[1], ax + dist[2], ay + dist[3]], axis=1
                )
            )
            scores_l.append(1.0 / (1.0 + np.exp(-cls.reshape(80, n).T)))

        boxes = np.concatenate(boxes_l, axis=0)
        scores_all = np.concatenate(scores_l, axis=0)
        best = scores_all.max(axis=1)
        keep = best > self.conf
        if not keep.any():
            return None, None, None
        return boxes[keep], best[keep], scores_all[keep].argmax(axis=1)

    # --------------------------------------------------------------- output

    def _to_frigate(self, boxes, scores, classes):
        detections = np.zeros((MAX_DETECTIONS, 6), np.float32)
        if boxes is None or len(boxes) == 0:
            return detections

        # Class-aware NMS: shifting each class into its own coordinate band is
        # cheaper than looping per class and gives the same result.
        offset = classes.astype(np.float32)[:, None] * 8192.0
        shifted = boxes + offset
        xywh = np.concatenate([shifted[:, :2], shifted[:, 2:] - shifted[:, :2]], axis=1)
        try:
            import cv2

            idxs = cv2.dnn.NMSBoxes(
                xywh.tolist(),
                scores.tolist(),
                self.conf,
                self.iou,
                top_k=MAX_DETECTIONS,
            )
            idxs = np.array(idxs, dtype=np.int64).reshape(-1)
        except Exception:  # noqa: BLE001 - cv2 always present in Frigate, but keep it safe
            idxs = np.argsort(-scores)[:MAX_DETECTIONS]

        idxs = idxs[np.argsort(-scores[idxs])][:MAX_DETECTIONS]
        sel = boxes[idxs] / float(self.width)  # square crop -> already normalised
        sel = np.clip(sel, 0.0, 1.0)
        for i, (box, score, cid) in enumerate(zip(sel, scores[idxs], classes[idxs])):
            detections[i] = [cid, score, box[1], box[0], box[3], box[2]]
        return detections
