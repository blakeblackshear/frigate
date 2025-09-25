"""Tools for determining if an object is stationary."""

import logging
from typing import Any, cast

import cv2
import numpy as np
from scipy.ndimage import gaussian_filter

logger = logging.getLogger(__name__)


THRESHOLD_KNOWN_ACTIVE_IOU = 0.2
THRESHOLD_STATIONARY_CHECK_IOU = 0.6
THRESHOLD_ACTIVE_CHECK_IOU = 0.9
MAX_STATIONARY_HISTORY = 10


class StationaryMotionClassifier:
    """Fallback classifier to prevent false flips from stationary to active.

    Uses appearance consistency on a fixed spatial region (historical median box)
    to detect actual movement, ignoring bounding box detection variations.
    """

    CROP_SIZE = 96
    NCC_KEEP_THRESHOLD = 0.90  # High correlation = keep stationary
    NCC_ACTIVE_THRESHOLD = 0.85  # Low correlation = consider active
    SHIFT_KEEP_THRESHOLD = 0.02  # Small shift = keep stationary
    SHIFT_ACTIVE_THRESHOLD = 0.04  # Large shift = consider active
    DRIFT_ACTIVE_THRESHOLD = 0.12  # Cumulative drift over 5 frames
    CHANGED_FRAMES_TO_FLIP = 2

    def __init__(self) -> None:
        self.anchor_crops: dict[str, np.ndarray] = {}
        self.anchor_boxes: dict[str, tuple[int, int, int, int]] = {}
        self.changed_counts: dict[str, int] = {}
        self.shift_histories: dict[str, list[float]] = {}

        # Pre-compute Hanning window for phase correlation
        hann = np.hanning(self.CROP_SIZE).astype(np.float64)
        self._hann2d = np.outer(hann, hann)

    def reset(self, id: str) -> None:
        logger.debug("StationaryMotionClassifier.reset: id=%s", id)
        if id in self.anchor_crops:
            del self.anchor_crops[id]
        if id in self.anchor_boxes:
            del self.anchor_boxes[id]
        self.changed_counts[id] = 0
        self.shift_histories[id] = []

    def _extract_y_crop(
        self, yuv_frame: np.ndarray, box: tuple[int, int, int, int]
    ) -> np.ndarray:
        """Extract and normalize Y-plane crop from bounding box."""
        y_height = yuv_frame.shape[0] // 3 * 2
        width = yuv_frame.shape[1]
        x1 = max(0, min(width - 1, box[0]))
        y1 = max(0, min(y_height - 1, box[1]))
        x2 = max(0, min(width - 1, box[2]))
        y2 = max(0, min(y_height - 1, box[3]))

        if x2 <= x1:
            x2 = min(width - 1, x1 + 1)
        if y2 <= y1:
            y2 = min(y_height - 1, y1 + 1)

        # Extract Y-plane crop, resize, and blur
        y_plane = yuv_frame[0:y_height, 0:width]
        crop = y_plane[y1:y2, x1:x2]
        crop_resized = cv2.resize(
            crop, (self.CROP_SIZE, self.CROP_SIZE), interpolation=cv2.INTER_AREA
        )
        result = cast(np.ndarray[Any, Any], gaussian_filter(crop_resized, sigma=0.5))
        logger.debug(
            "_extract_y_crop: box=%s clamped=(%d,%d,%d,%d) crop_shape=%s",
            box,
            x1,
            y1,
            x2,
            y2,
            crop.shape if 'crop' in locals() else None,
        )
        return result

    def ensure_anchor(
        self, id: str, yuv_frame: np.ndarray, median_box: tuple[int, int, int, int]
    ) -> None:
        """Initialize anchor crop from stable median box when object becomes stationary."""
        if id not in self.anchor_crops:
            self.anchor_boxes[id] = median_box
            self.anchor_crops[id] = self._extract_y_crop(yuv_frame, median_box)
            self.changed_counts[id] = 0
            self.shift_histories[id] = []
            logger.debug(
                "ensure_anchor: initialized id=%s median_box=%s crop_shape=%s",
                id,
                median_box,
                self.anchor_crops[id].shape,
            )

    def on_active(self, id: str) -> None:
        """Reset state when object becomes active to allow re-anchoring."""
        logger.debug("on_active: id=%s became active; resetting state", id)
        self.reset(id)

    def evaluate(
        self, id: str, yuv_frame: np.ndarray, current_box: tuple[int, int, int, int]
    ) -> bool:
        """Return True to keep stationary, False to flip to active.

        Compares the same spatial region (historical median box) across frames
        to detect actual movement, ignoring bounding box variations.
        """

        if id not in self.anchor_crops or id not in self.anchor_boxes:
            logger.debug(
                "evaluate: id=%s has no anchor; default keep stationary", id
            )
            return True

        # Compare same spatial region across frames
        anchor_box = self.anchor_boxes[id]
        anchor_crop = self.anchor_crops[id]
        curr_crop = self._extract_y_crop(yuv_frame, anchor_box)

        # Compute appearance and motion metrics
        ncc = cv2.matchTemplate(curr_crop, anchor_crop, cv2.TM_CCOEFF_NORMED)[0, 0]
        a64 = anchor_crop.astype(np.float64) * self._hann2d
        c64 = curr_crop.astype(np.float64) * self._hann2d
        (shift_x, shift_y), _ = cv2.phaseCorrelate(a64, c64)
        shift_norm = float(np.hypot(shift_x, shift_y)) / float(self.CROP_SIZE)

        logger.debug(
            "evaluate: id=%s metrics ncc=%.4f shift_norm=%.4f (shift_x=%.3f, shift_y=%.3f)",
            id,
            float(ncc),
            shift_norm,
            float(shift_x),
            float(shift_y),
        )

        # Update rolling shift history
        history = self.shift_histories.get(id, [])
        history.append(shift_norm)
        if len(history) > 5:
            history = history[-5:]
        self.shift_histories[id] = history
        drift_sum = float(sum(history))

        logger.debug(
            "evaluate: id=%s history_len=%d last_shift=%.4f drift_sum=%.4f",
            id,
            len(history),
            history[-1] if history else -1.0,
            drift_sum,
        )

        # Early exit for clear stationary case
        if ncc >= self.NCC_KEEP_THRESHOLD and shift_norm < self.SHIFT_KEEP_THRESHOLD:
            self.changed_counts[id] = 0
            logger.debug(
                "evaluate: id=%s early-stationary keep=True (ncc>=%.2f and shift<%.2f)",
                id,
                self.NCC_KEEP_THRESHOLD,
                self.SHIFT_KEEP_THRESHOLD,
            )
            return True

        # Check for movement indicators
        movement_detected = (
            ncc < self.NCC_ACTIVE_THRESHOLD
            or shift_norm >= self.SHIFT_ACTIVE_THRESHOLD
            or drift_sum >= self.DRIFT_ACTIVE_THRESHOLD
        )

        if movement_detected:
            cnt = self.changed_counts.get(id, 0) + 1
            self.changed_counts[id] = cnt
            if (
                cnt >= self.CHANGED_FRAMES_TO_FLIP
                or drift_sum >= self.DRIFT_ACTIVE_THRESHOLD
            ):
                logger.debug(
                    "evaluate: id=%s flip_to_active=True cnt=%d drift_sum=%.4f thresholds(changed>=%d drift>=%.2f)",
                    id,
                    cnt,
                    drift_sum,
                    self.CHANGED_FRAMES_TO_FLIP,
                    self.DRIFT_ACTIVE_THRESHOLD,
                )
                return False
            logger.debug(
                "evaluate: id=%s movement_detected cnt=%d keep_until_cnt>=%d",
                id,
                cnt,
                self.CHANGED_FRAMES_TO_FLIP,
            )
        else:
            self.changed_counts[id] = 0
            logger.debug("evaluate: id=%s no_movement keep=True", id)

        return True
