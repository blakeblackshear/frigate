"""Tests for handling of YuNet face detection results."""

import unittest
from unittest.mock import MagicMock

import numpy as np

from frigate.data_processing.common.face.detector import FaceDetector


def _yunet_row(
    x: float, y: float, w: float, h: float, score: float = 0.9
) -> np.ndarray:
    """Build a single YuNet detection row of box, 5 landmarks, and score."""
    landmarks = [
        x + w * 0.3, y + h * 0.35,  # image left eye
        x + w * 0.7, y + h * 0.35,  # image right eye
        x + w * 0.5, y + h * 0.55,  # nose tip
        x + w * 0.35, y + h * 0.75,  # image left mouth corner
        x + w * 0.65, y + h * 0.75,  # image right mouth corner
    ]  # fmt: skip
    return np.array([x, y, w, h, *landmarks, score], dtype=np.float32)


class TestFaceDetectorResults(unittest.TestCase):
    def _make_detector(self, rows: list[np.ndarray] | None) -> FaceDetector:
        """Build a detector with a stubbed model, bypassing model downloads."""
        detector = FaceDetector.__new__(FaceDetector)
        detector.detector = MagicMock()
        detector.detector.detect.return_value = (
            1,
            None if rows is None else np.array(rows, dtype=np.float32),
        )
        return detector

    def test_face_cut_off_at_edge_stays_inside_image(self):
        """YuNet reports negative coordinates for faces that are cut off."""
        detector = self._make_detector([_yunet_row(-6.4, -3.2, 50, 60)])
        image = np.zeros((200, 200, 3), dtype=np.uint8)

        result = detector.detect(image, 0.5)

        assert result is not None
        # the clamped near edges must not drag the far edges out with them
        self.assertEqual(result.face, (0, 0, 43, 56))

        x1, y1, x2, y2 = result.face
        self.assertGreater(image[y1:y2, x1:x2].size, 0)

    def test_face_past_far_edge_is_clamped_to_image(self):
        detector = self._make_detector([_yunet_row(80, 70, 50, 60)])
        image = np.zeros((100, 100, 3), dtype=np.uint8)

        result = detector.detect(image, 0.5)

        assert result is not None
        self.assertEqual(result.face, (80, 70, 100, 100))

    def test_landmarks_are_returned_in_detector_order(self):
        detector = self._make_detector([_yunet_row(10, 20, 40, 50)])
        image = np.zeros((200, 200, 3), dtype=np.uint8)

        result = detector.detect(image, 0.5)

        assert result is not None
        self.assertEqual(
            result.landmarks,
            (
                (22.0, 37.5),  # image left eye
                (38.0, 37.5),  # image right eye
                (30.0, 47.5),  # nose tip
                (24.0, 57.5),  # image left mouth corner
                (36.0, 57.5),  # image right mouth corner
            ),
        )

    def test_box_and_landmarks_are_scaled_back_to_full_resolution(self):
        """Tall images are downscaled for detection before being reported."""
        detector = self._make_detector([_yunet_row(100, 200, 50, 60)])
        image = np.zeros((2160, 400, 3), dtype=np.uint8)

        result = detector.detect(image, 0.5)

        assert result is not None
        # detection runs at 1080 height, so results come back at half scale
        self.assertEqual(result.face, (200, 400, 300, 520))
        self.assertEqual(result.landmarks[0], (230.0, 442.0))

    def test_largest_face_is_returned(self):
        detector = self._make_detector(
            [_yunet_row(0, 0, 20, 20), _yunet_row(50, 50, 60, 60)]
        )
        image = np.zeros((200, 200, 3), dtype=np.uint8)

        result = detector.detect(image, 0.5)

        assert result is not None
        self.assertEqual(result.face, (50, 50, 110, 110))

    def test_faces_below_threshold_are_ignored(self):
        detector = self._make_detector([_yunet_row(10, 10, 40, 40, score=0.3)])
        image = np.zeros((200, 200, 3), dtype=np.uint8)

        self.assertIsNone(detector.detect(image, 0.5))

    def test_no_faces_returns_none(self):
        detector = self._make_detector(None)
        image = np.zeros((200, 200, 3), dtype=np.uint8)

        self.assertIsNone(detector.detect(image, 0.5))

    def test_unbuilt_detector_returns_none(self):
        detector = FaceDetector.__new__(FaceDetector)
        detector.detector = None
        image = np.zeros((200, 200, 3), dtype=np.uint8)

        self.assertIsNone(detector.detect(image, 0.5))
