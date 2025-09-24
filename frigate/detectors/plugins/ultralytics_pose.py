"""Ultralytics YOLO pose detector integration."""

import logging
from typing import Any

import numpy as np
from pydantic import Field
from typing_extensions import Literal

from frigate.detectors.detection_api import DetectionApi
from frigate.detectors.detector_config import (
    BaseDetectorConfig,
    ModelTypeEnum,
)

logger = logging.getLogger(__name__)

DETECTOR_KEY = "ultralytics_pose"


class UltralyticsPoseDetectorConfig(BaseDetectorConfig):
    """Detector configuration for Ultralytics YOLO pose models."""

    type: Literal[DETECTOR_KEY]
    device: str = Field(default="cpu", title="Torch device to run inference on")
    half_precision: bool = Field(
        default=False, title="Run the model in half precision (GPU only)"
    )
    max_detections: int = Field(
        default=20, title="Maximum number of detections to return"
    )


class UltralyticsPoseDetector(DetectionApi):
    """Detector implementation that wraps Ultralytics YOLO pose models."""

    type_key = DETECTOR_KEY
    supported_models = [ModelTypeEnum.yolo_pose]

    def __init__(self, detector_config: UltralyticsPoseDetectorConfig):
        super().__init__(detector_config)

        try:
            from ultralytics import YOLO
        except ImportError as exc:  # pragma: no cover - dependency guard
            raise RuntimeError(
                "The 'ultralytics' package is required for the ultralytics_pose detector"
            ) from exc

        if detector_config.model is None or not detector_config.model.path:
            raise ValueError(
                "Ultralytics pose detector requires 'model.path' to be configured."
            )

        self.device = detector_config.device
        self.max_detections = detector_config.max_detections
        self.labelmap = detector_config.model.merged_labelmap if detector_config.model else {}

        logger.info(
            "Loading Ultralytics YOLO pose model from %s on device %s",
            detector_config.model.path,
            self.device,
        )
        self.model = YOLO(detector_config.model.path)
        if self.device:
            self.model.to(self.device)

        # Configure inference defaults
        self.model.overrides.setdefault("task", "pose")
        self.model.overrides["conf"] = self.thresh
        self.model.overrides["verbose"] = False
        self.model.overrides["max_det"] = self.max_detections

        # Enable half precision when explicitly requested and supported
        self._use_half = bool(detector_config.half_precision)
        if self._use_half and self.device and self.device != "cpu":
            try:
                self.model.model.half()
            except AttributeError:
                logger.warning(
                    "Unable to enable half precision for Ultralytics model; proceeding in fp32."
                )
                self._use_half = False
        elif self._use_half:
            logger.warning(
                "Half precision requested but unsupported on CPU; proceeding in fp32."
            )
            self._use_half = False

    def detect_raw(self, tensor_input: np.ndarray) -> np.ndarray:
        frame = tensor_input[0]
        if frame.dtype != np.uint8:
            frame = frame.astype(np.uint8)

        # Ensure contiguous memory for torch consumption
        frame = np.ascontiguousarray(frame)

        try:
            results = self.model.predict(
                frame,
                imgsz=(self.height, self.width),
                device=self.device,
                conf=self.thresh,
                verbose=False,
                max_det=self.max_detections,
            )
        except Exception as exc:  # pragma: no cover - runtime safeguard
            logger.exception("Ultralytics pose inference failed: %s", exc)
            raise

        detections = np.zeros((self.max_detections, 6), dtype=np.float32)

        if not results:
            return detections

        result = results[0]
        boxes = getattr(result, "boxes", None)

        if boxes is None or boxes.xyxy is None:
            return detections

        xyxy = self._to_numpy(boxes.xyxy)
        confidences = self._to_numpy(boxes.conf)
        classes = self._to_numpy(boxes.cls)

        num_detections = min(len(xyxy), self.max_detections)

        log_entries = []

        for idx in range(num_detections):
            x_min, y_min, x_max, y_max = xyxy[idx]
            detections[idx] = (
                float(classes[idx]),
                float(confidences[idx]),
                float(max(0.0, min(1.0, y_min / self.height))),
                float(max(0.0, min(1.0, x_min / self.width))),
                float(max(0.0, min(1.0, y_max / self.height))),
                float(max(0.0, min(1.0, x_max / self.width))),
            )

            if logger.isEnabledFor(logging.DEBUG):
                class_id = int(classes[idx]) if idx < len(classes) else None
                label = self.labelmap.get(class_id, f"unknown_{class_id}")
                log_entries.append(
                    f"{label} (class={class_id}) conf={float(confidences[idx]):.3f} "
                    f"bbox=({x_min:.1f},{y_min:.1f},{x_max:.1f},{y_max:.1f})"
                )

        if log_entries:
            logger.debug(
                "Ultralytics pose detections: %s",
                "; ".join(log_entries),
            )

        return detections

    @staticmethod
    def _to_numpy(value: Any) -> np.ndarray:
        if hasattr(value, "detach"):
            value = value.detach()
        if hasattr(value, "cpu"):
            value = value.cpu()
        if hasattr(value, "numpy"):
            return value.numpy()
        return np.asarray(value)
