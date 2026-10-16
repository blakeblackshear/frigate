import unittest

import cv2
import numpy as np

from frigate.util.image import get_histogram


def reference_histogram(image, x_min, y_min, x_max, y_max):
    bgr = cv2.cvtColor(image, cv2.COLOR_YUV2BGR_I420)[y_min:y_max, x_min:x_max]
    hist = cv2.calcHist([bgr], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    return cv2.normalize(hist, hist).flatten()


class TestGetHistogram(unittest.TestCase):
    def setUp(self):
        rng = np.random.default_rng(0)
        self.frame = rng.integers(0, 255, (720 * 3 // 2, 1280), np.uint8)

    def test_matches_full_frame_conversion_on_even_box(self):
        box = (100, 200, 400, 600)
        np.testing.assert_array_equal(
            get_histogram(self.frame, *box), reference_histogram(self.frame, *box)
        )

    def test_odd_box_widens_to_even_edges(self):
        np.testing.assert_array_equal(
            get_histogram(self.frame, 101, 201, 399, 599),
            reference_histogram(self.frame, 100, 200, 400, 600),
        )

    def test_box_is_clamped_to_frame(self):
        np.testing.assert_array_equal(
            get_histogram(self.frame, -10, -10, 5000, 5000),
            reference_histogram(self.frame, 0, 0, 1280, 720),
        )

    def test_empty_box_returns_zeros(self):
        hist = get_histogram(self.frame, 50, 50, 50, 50)
        self.assertEqual(hist.shape, (512,))
        self.assertEqual(hist.sum(), 0)
