"""CPU baseline for the raw-head YOLO models served by the vitisai plugin,
for direct NPU-vs-CPU comparison.

Reuses the decode logic (DFL, anchors, NMS) by subclassing VitisAIDetector
and only replacing session creation: CPUExecutionProvider instead of
VitisAIExecutionProvider, no xclbin/cache/dispatch-check machinery.

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
          - cpu_yolo
"""

import logging
from typing import Literal

import numpy as np
import onnxruntime as ort
from pydantic import ConfigDict, Field

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig

from .vitisai import VitisAIDetector

logger = logging.getLogger(__name__)

DETECTOR_KEY = "cpu_yolo"


class CPUYoloDetectorConfig(BaseDetectorConfig):
    """CPU baseline for the raw-head YOLO models (same decode as VitisAI EP)."""

    model_config = ConfigDict(title="CPU YOLO (raw-head, NPU comparison baseline)")

    type: Literal[DETECTOR_KEY]
    family: Literal["auto", "nas", "v8"] = Field(
        default="auto",
        description="Head layout: 'nas' for YOLO-NAS-S (6 outputs), 'v8' for YOLOv8 (2 outputs), 'auto' to pick from the model's output count.",
    )
    conf: float = Field(default=0.4, description="Score threshold applied before NMS.")
    iou: float = Field(default=0.5, description="IoU threshold for class-aware NMS.")


class CPUYoloDetector(VitisAIDetector, DetectionApi):
    """Same decode as VitisAIDetector; CPUExecutionProvider instead of NPU.

    Explicitly (re-)listing DetectionApi as a base is required. Subclassing
    VitisAIDetector alone (itself a direct DetectionApi subclass) would
    make this class invisible to that scan.
    """

    type_key = DETECTOR_KEY

    def __init__(self, detector_config: CPUYoloDetectorConfig):
        DetectionApi.__init__(self, detector_config)

        self.family = detector_config.family
        self.conf = detector_config.conf
        self.iou = detector_config.iou
        model_path = detector_config.model.path

        so = ort.SessionOptions()
        so.log_severity_level = 3
        logger.info("CPU: loading %s", model_path)
        self.ort = ort.InferenceSession(
            model_path, sess_options=so, providers=["CPUExecutionProvider"]
        )
        self.input_name = self.ort.get_inputs()[0].name
        self.output_names = [o.name for o in self.ort.get_outputs()]
        self._resolve_family()

        self._build_anchors()

        shape = (1, 3, self.height, self.width)
        self.detect_raw(np.zeros(shape, dtype=np.float32))
        logger.info("CPU: %s ready", model_path)
