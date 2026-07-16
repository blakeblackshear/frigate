import math
import unittest

import numpy as np
from norfair.camera_motion import (
    HomographyTransformation,
    TranslationTransformation,
)

from frigate.ptz.autotrack import transform_is_finite
from frigate.track.norfair_tracker import distance


class TestNorfairDistance(unittest.TestCase):
    """Regression tests for the tracker distance guard.

    norfair raises a hard ValueError on any nan distance, which kills the camera
    process. During autotracking, an ill-conditioned homography can hand the
    tracker a non-finite or degenerate estimate box, so distance() must never
    return nan for any input.
    """

    def setUp(self) -> None:
        # boxes are [[x1, y1], [x2, y2]]
        self.detection = np.array([[805.0, 402.0], [864.0, 521.0]])
        self.estimate = np.array([[800.0, 400.0], [860.0, 520.0]])

    def test_finite_boxes_give_finite_distance(self) -> None:
        d = distance(self.detection, self.estimate)
        self.assertTrue(math.isfinite(d))

    def test_inf_estimate_corner_does_not_return_nan(self) -> None:
        estimate = np.array([[np.inf, 400.0], [860.0, 520.0]])
        d = distance(self.detection, estimate)
        self.assertFalse(math.isnan(d))
        self.assertEqual(d, float("inf"))

    def test_nan_estimate_corner_does_not_return_nan(self) -> None:
        # the actual autotracking crash: a positive-only guard would miss this
        # because nan <= 0 is False
        estimate = np.array([[np.nan, 400.0], [860.0, 520.0]])
        d = distance(self.detection, estimate)
        self.assertFalse(math.isnan(d))
        self.assertEqual(d, float("inf"))

    def test_zero_area_estimate_does_not_return_nan(self) -> None:
        estimate = np.array([[900.0, 500.0], [900.0, 500.0]])
        d = distance(self.detection, estimate)
        self.assertFalse(math.isnan(d))
        self.assertEqual(d, float("inf"))

    def test_zero_area_detection_does_not_return_nan(self) -> None:
        detection = np.array([[805.0, 402.0], [805.0, 521.0]])
        d = distance(detection, self.estimate)
        self.assertFalse(math.isnan(d))
        self.assertEqual(d, float("inf"))

    def test_inverted_estimate_corners_do_not_return_nan(self) -> None:
        # Kalman estimates can occasionally cross corners (x2 < x1)
        estimate = np.array([[860.0, 520.0], [800.0, 400.0]])
        d = distance(self.detection, estimate)
        self.assertFalse(math.isnan(d))
        self.assertEqual(d, float("inf"))


class TestTransformIsFinite(unittest.TestCase):
    def test_finite_homography_is_finite(self) -> None:
        matrix = np.array([[1.0, 0.0, 5.0], [0.0, 1.0, 3.0], [0.0, 0.0, 1.0]])
        self.assertTrue(transform_is_finite(HomographyTransformation(matrix)))

    def test_finite_translation_is_finite(self) -> None:
        self.assertTrue(
            transform_is_finite(TranslationTransformation(np.array([12.0, -4.0])))
        )

    def test_non_finite_homography_is_not_finite(self) -> None:
        transform = HomographyTransformation(np.eye(3))
        # simulate accumulation overflowing to a non-finite matrix
        transform.homography_matrix = np.array(
            [[1.0, 0.0, np.inf], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]
        )
        self.assertFalse(transform_is_finite(transform))

    def test_nan_translation_is_not_finite(self) -> None:
        self.assertFalse(
            transform_is_finite(TranslationTransformation(np.array([np.nan, 0.0])))
        )


if __name__ == "__main__":
    unittest.main()
