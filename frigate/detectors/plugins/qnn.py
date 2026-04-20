import logging
import os
from typing import Literal

import cv2
import numpy as np
from pydantic import ConfigDict, Field
from typing_extensions import Annotated

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import BaseDetectorConfig, ModelTypeEnum

try:
    from qai_appbuilder import (
        LogLevel,
        PerfProfile,
        ProfilingLevel,
        QNNConfig,
        QNNContext,
        Runtime,
    )

    QNN_SUPPORT = True
except ImportError:
    QNN_SUPPORT = False

logger = logging.getLogger(__name__)

DETECTOR_KEY = "qnn"
DEFAULT_QNN_LIB_DIR = "/opt/qairt/lib"
MAX_DETECTIONS = 20


class QnnDetectorConfig(BaseDetectorConfig):
    """QNN detector for Qualcomm Hexagon NPUs via QAIRT / qai_appbuilder.

    Runs pre-compiled QNN context binaries (.bin) produced by Qualcomm AI Hub
    on the Hexagon NPU. Tested on QCS6490 (Hexagon v68) with YOLOv8 detection.
    """

    model_config = ConfigDict(
        title="QNN",
    )

    type: Literal[DETECTOR_KEY]
    qnn_lib_dir: str = Field(
        default=DEFAULT_QNN_LIB_DIR,
        title="Directory containing QAIRT runtime libraries (libQnnHtp.so etc.).",
    )
    soc_id: str = Field(
        default="6490",
        title="Qualcomm SoC id. Controls output-tensor ordering of the AI Hub "
        "model: '6490' yields [scores, classes, boxes]; other SoCs yield "
        "[boxes, scores, classes].",
    )
    conf_threshold: Annotated[float, Field(ge=0.0, le=1.0)] = 0.25
    iou_threshold: Annotated[float, Field(ge=0.0, le=1.0)] = 0.7


class QnnDetector(DetectionApi):
    type_key = DETECTOR_KEY
    supported_models = [ModelTypeEnum.yologeneric]

    def __init__(self, detector_config: QnnDetectorConfig):
        super().__init__(detector_config)
        if not QNN_SUPPORT:
            logger.error(
                "qai_appbuilder is not installed. Use the -qcs6490 Docker image "
                "variant for Qualcomm Hexagon NPU support."
            )
            return

        model_path = detector_config.model.path
        if not model_path or not os.path.exists(model_path):
            raise FileNotFoundError(f"QNN model not found: {model_path}")

        self._input_size = detector_config.model.width
        self._soc_id = detector_config.soc_id
        self._conf = detector_config.conf_threshold
        self._iou = detector_config.iou_threshold

        QNNConfig.Config(
            detector_config.qnn_lib_dir,
            Runtime.HTP,
            LogLevel.WARN,
            ProfilingLevel.BASIC,
        )
        self._ctx = QNNContext("yolo", model_path)
        PerfProfile.SetPerfProfileGlobal(PerfProfile.BURST)
        logger.info(
            "QNN detector loaded model=%s size=%d soc=%s",
            model_path,
            self._input_size,
            self._soc_id,
        )

    def detect_raw(self, tensor_input: np.ndarray) -> np.ndarray:
        # Frigate hands a view backed by shared-memory mmap. qai_appbuilder's
        # C++ boundary segfaults on non-owning buffers — always copy.
        arr = np.ascontiguousarray(tensor_input, dtype=np.float32)
        if arr.ndim == 3:
            arr = arr[None, ...]
        if arr.size and float(arr.max()) > 1.5:
            arr = arr / 255.0

        outputs = self._ctx.Inference([arr])
        return self._decode(outputs)

    def _decode(self, outputs: list[np.ndarray]) -> np.ndarray:
        if self._soc_id == "6490":
            scores = np.asarray(outputs[0]).reshape(-1)
            classes = np.asarray(outputs[1]).reshape(-1).astype(np.int32)
            boxes = np.asarray(outputs[2]).reshape(-1, 4)
        else:
            boxes = np.asarray(outputs[0]).reshape(-1, 4)
            scores = np.asarray(outputs[1]).reshape(-1)
            classes = np.asarray(outputs[2]).reshape(-1).astype(np.int32)

        mask = scores >= self._conf
        boxes, scores, classes = boxes[mask], scores[mask], classes[mask]

        out = np.zeros((MAX_DETECTIONS, 6), dtype=np.float32)
        if boxes.size == 0:
            return out

        cv_boxes = np.stack(
            [
                boxes[:, 0],
                boxes[:, 1],
                boxes[:, 2] - boxes[:, 0],
                boxes[:, 3] - boxes[:, 1],
            ],
            axis=1,
        ).tolist()
        idxs = cv2.dnn.NMSBoxes(cv_boxes, scores.tolist(), self._conf, self._iou)
        if len(idxs) == 0:
            return out
        idxs = np.asarray(idxs).reshape(-1)[:MAX_DETECTIONS]

        size = float(self._input_size)
        for slot, i in enumerate(idxs):
            x1, y1, x2, y2 = boxes[i]
            out[slot] = (
                float(classes[i]),
                float(scores[i]),
                float(np.clip(y1 / size, 0.0, 1.0)),
                float(np.clip(x1 / size, 0.0, 1.0)),
                float(np.clip(y2 / size, 0.0, 1.0)),
                float(np.clip(x2 / size, 0.0, 1.0)),
            )
        return out
