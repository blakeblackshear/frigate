"""Tests for face detection results, landmark selection, and face alignment."""

import threading
import unittest
from unittest.mock import MagicMock

import cv2
import numpy as np

from frigate.data_processing.common.face.detector import (
    FACE_TEMPLATE,
    FACE_TEMPLATE_SIZE,
    MAX_LANDMARK_FIT_ERROR,
    FaceDetector,
    landmark_fit_error,
)
from frigate.data_processing.common.face.recognizer import FaceRecognizer

# a real detection from a 27x30 crop where the left mouth corner landed above
# the eye line, the case the fit error check exists to catch
BROKEN_LANDMARKS = (
    (7.07, 8.98),
    (16.98, 9.59),
    (10.79, 15.78),
    (6.76, 6.50),
    (15.43, 21.05),
)


def _yunet_row(x: float, y: float, w: float, h: float, score: float = 0.9):
    """Build a YuNet detection row of box, 5 landmarks, and score."""
    landmarks = [
        x + w * 0.3, y + h * 0.35,
        x + w * 0.7, y + h * 0.35,
        x + w * 0.5, y + h * 0.55,
        x + w * 0.35, y + h * 0.75,
        x + w * 0.65, y + h * 0.75,
    ]  # fmt: skip
    return np.array([x, y, w, h, *landmarks, score], dtype=np.float32)


def _row_with_landmarks(landmarks, x=0.0, y=0.0, w=30.0, h=30.0):
    """Build a YuNet detection row carrying specific landmarks."""
    flat = [v for point in landmarks for v in point]
    return np.array([x, y, w, h, *flat, 0.9], dtype=np.float32)


def _detector(rows=None, lbf_points=None) -> FaceDetector:
    """Build a detector with stubbed models, bypassing model downloads."""
    detector = FaceDetector.__new__(FaceDetector)
    detector.lock = threading.Lock()
    detector.detector = MagicMock()
    detector.detector.detect.return_value = (
        1,
        None if rows is None else np.array(rows, dtype=np.float32),
    )

    if lbf_points is None:
        detector.landmark_detector = None
    else:
        detector.landmark_detector = MagicMock()
        detector.landmark_detector.fit.return_value = (
            True,
            [np.array([lbf_points], dtype=np.float32)],
        )

    return detector


class TestFaceBox(unittest.TestCase):
    """The reported bug: YuNet returns floats outside of the image."""

    def test_face_cut_off_at_near_edge_stays_inside_image(self):
        detector = _detector([_yunet_row(-6.4, -3.2, 50, 60)])

        result = detector.detect(np.zeros((200, 200, 3), np.uint8), 0.5)

        assert result is not None
        # clamping the near edges must not drag the far edges out with them
        self.assertEqual(result.face, (0, 0, 43, 56))

    def test_face_past_far_edge_is_clamped_to_image(self):
        detector = _detector([_yunet_row(80, 70, 50, 60)])

        result = detector.detect(np.zeros((100, 100, 3), np.uint8), 0.5)

        assert result is not None
        self.assertEqual(result.face, (80, 70, 100, 100))

    def test_box_and_landmarks_are_scaled_back_to_full_resolution(self):
        """Tall images are downscaled for detection before being reported."""
        detector = _detector([_yunet_row(100, 200, 50, 60)])

        result = detector.detect(np.zeros((2160, 400, 3), np.uint8), 0.5)

        assert result is not None
        # detection runs at 1080 height, so results come back at half scale
        self.assertEqual(result.face, (200, 400, 300, 520))
        self.assertEqual(result.landmarks[0], (230.0, 442.0))

    def test_largest_face_is_returned(self):
        detector = _detector([_yunet_row(0, 0, 20, 20), _yunet_row(50, 50, 60, 60)])

        result = detector.detect(np.zeros((200, 200, 3), np.uint8), 0.5)

        assert result is not None
        self.assertEqual(result.face, (50, 50, 110, 110))


class TestLandmarkFitError(unittest.TestCase):
    def test_error_ignores_scale_rotation_and_position(self):
        """The metric must only measure shape, so the threshold is meaningful."""
        angle = np.radians(20)
        rotate = np.array(
            [[np.cos(angle), -np.sin(angle)], [np.sin(angle), np.cos(angle)]],
            dtype=np.float32,
        )
        moved = (FACE_TEMPLATE * 3.7) @ rotate.T + np.array([250.0, -40.0])

        self.assertLess(landmark_fit_error(tuple(map(tuple, FACE_TEMPLATE))), 0.01)
        self.assertLess(landmark_fit_error(tuple(map(tuple, moved))), 0.01)

    def test_implausible_landmarks_score_above_the_threshold(self):
        self.assertGreater(landmark_fit_error(BROKEN_LANDMARKS), MAX_LANDMARK_FIT_ERROR)


class TestLandmarkSelection(unittest.TestCase):
    """get_face_landmarks prefers detection and falls back to the landmark model."""

    def _lbf_points(self):
        # only the points the 5 point mapping reads have to be real
        points = np.zeros((68, 2), dtype=np.float32)
        points[36:42] = [10.0, 20.0]
        points[42:48] = [30.0, 20.0]
        points[30] = [20.0, 30.0]
        points[48] = [12.0, 40.0]
        points[54] = [28.0, 40.0]
        return points

    def test_plausible_detection_landmarks_are_used(self):
        detector = _detector([_yunet_row(10, 20, 40, 50)], self._lbf_points())

        result = detector.get_face_landmarks(np.zeros((200, 200, 3), np.uint8))

        self.assertEqual(result[0], (22.0, 37.5))
        detector.landmark_detector.fit.assert_not_called()

    def test_implausible_detection_landmarks_fall_back_to_landmark_model(self):
        detector = _detector(
            [_row_with_landmarks(BROKEN_LANDMARKS)], self._lbf_points()
        )

        result = detector.get_face_landmarks(np.zeros((30, 27, 3), np.uint8))

        # the 68 point model maps to eyes, nose tip, then mouth corners
        self.assertEqual(
            result,
            ((10.0, 20.0), (30.0, 20.0), (20.0, 30.0), (12.0, 40.0), (28.0, 40.0)),
        )

    def test_no_usable_landmarks_returns_none(self):
        detector = _detector([_row_with_landmarks(BROKEN_LANDMARKS)])

        self.assertIsNone(detector.get_face_landmarks(np.zeros((30, 27, 3), np.uint8)))


class _StubRecognizer(FaceRecognizer):
    """Concrete recognizer so align_face can be exercised without a model."""

    def build(self) -> None:
        pass

    def clear(self) -> None:
        pass

    def classify(self, face_image):
        return None


class TestAlignFace(unittest.TestCase):
    def _recognizer(self, landmarks):
        detector = MagicMock()
        detector.get_face_landmarks.return_value = landmarks
        return _StubRecognizer(MagicMock(), detector)

    def _assert_lands_on_template(self, output_size: int):
        # place the landmarks as a scaled and shifted copy of the template, so
        # a correct warp puts them back onto the template exactly
        source = tuple(map(tuple, FACE_TEMPLATE * 2.0 + np.array([60.0, 25.0])))
        recognizer = self._recognizer(source)

        image = np.zeros((300, 300, 3), np.uint8)
        for x, y in source:
            cv2.circle(image, (int(round(x)), int(round(y))), 4, (255, 255, 255), -1)

        aligned = recognizer.align_face(image, output_size)

        assert aligned is not None
        self.assertEqual(aligned.shape, (output_size, output_size, 3))

        gray = cv2.cvtColor(aligned, cv2.COLOR_BGR2GRAY)
        for x, y in FACE_TEMPLATE * (output_size / FACE_TEMPLATE_SIZE):
            window = gray[int(y) - 2 : int(y) + 3, int(x) - 2 : int(x) + 3]
            self.assertGreater(
                window.max(),
                200,
                f"no landmark near ({x:.0f}, {y:.0f}) at {output_size}",
            )

    def test_landmarks_are_warped_onto_the_template(self):
        self._assert_lands_on_template(FACE_TEMPLATE_SIZE)

    def test_template_is_scaled_to_the_model_input_size(self):
        """The facenet model takes 160px, the template has to scale with it."""
        self._assert_lands_on_template(160)

    def test_missing_landmarks_return_none(self):
        self.assertIsNone(
            self._recognizer(None).align_face(np.zeros((60, 60, 3), np.uint8), 112)
        )
