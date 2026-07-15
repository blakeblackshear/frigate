"""Tests for motion search spatial (crop/scale/mask) helpers."""

import unittest

import numpy as np

from frigate.jobs.motion_search import (
    build_scaled_roi_mask,
    compute_roi_crop_and_scale,
    detect_motion_scaled,
)


class TestComputeRoiCropAndScale(unittest.TestCase):
    def test_crop_box_in_record_pixels(self):
        # ROI covering x [0.25, 0.75], y [0.5, 1.0] of a 1000x600 frame.
        polygon = [[0.25, 0.5], [0.75, 0.5], [0.75, 1.0], [0.25, 1.0]]
        crop, scaled = compute_roi_crop_and_scale(polygon, 1000, 600, scale_target=125)
        cw, ch, cx, cy = crop
        self.assertEqual((cx, cy), (250, 300))
        self.assertEqual((cw, ch), (500, 300))
        # longest side 500 -> factor 0.25 -> (125, 75), rounded down to even.
        self.assertEqual(scaled, (124, 74))

    def test_never_upscales(self):
        polygon = [[0.0, 0.0], [0.1, 0.0], [0.1, 0.1], [0.0, 0.1]]
        crop, scaled = compute_roi_crop_and_scale(polygon, 200, 200, scale_target=400)
        cw, ch, _, _ = crop
        # crop is 20x20; target 400 would upscale, so scaled == crop size.
        self.assertEqual(scaled, (cw, ch))

    def test_scaled_dims_are_at_least_one(self):
        polygon = [[0.0, 0.0], [0.02, 0.0], [0.02, 0.02], [0.0, 0.02]]
        crop, scaled = compute_roi_crop_and_scale(polygon, 50, 50, scale_target=1)
        self.assertGreaterEqual(scaled[0], 1)
        self.assertGreaterEqual(scaled[1], 1)

    def test_all_dims_are_even_for_nv12(self):
        # Odd-aligned ROI on an odd-ish frame must still yield even crop/scale so
        # the nv12 hwdownload byte stream matches the expected frame size.
        polygon = [[0.123, 0.321], [0.777, 0.321], [0.777, 0.901], [0.123, 0.901]]
        crop, scaled = compute_roi_crop_and_scale(polygon, 1377, 911, scale_target=257)
        for value in (*crop, *scaled):
            self.assertEqual(value % 2, 0, f"{value} is not even")


class TestBuildScaledRoiMask(unittest.TestCase):
    def test_mask_matches_scaled_dims_and_has_coverage(self):
        polygon = [[0.25, 0.5], [0.75, 0.5], [0.75, 1.0], [0.25, 1.0]]
        crop, scaled = compute_roi_crop_and_scale(polygon, 1000, 600, scale_target=125)
        mask = build_scaled_roi_mask(polygon, 1000, 600, crop, scaled)
        self.assertEqual(mask.shape, (scaled[1], scaled[0]))
        self.assertEqual(mask.dtype, np.uint8)
        # A full rectangle ROI fills its whole crop -> mask is all 255.
        self.assertGreater(np.count_nonzero(mask), 0)
        self.assertEqual(np.count_nonzero(mask), mask.size)


class TestDetectMotionScaled(unittest.TestCase):
    def _ts(self, idx):
        return float(idx)

    def test_finds_change_between_frames(self):
        mask = np.full((60, 80), 255, dtype=np.uint8)
        f0 = np.zeros((60, 80), dtype=np.uint8)
        f1 = np.zeros((60, 80), dtype=np.uint8)
        f1[10:50, 20:60] = 255  # big bright block appears
        frames = [(0, f0), (30, f1)]
        results = detect_motion_scaled(
            frames, mask, threshold=30, min_area=1.0, timestamp_fn=self._ts
        )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].timestamp, 30.0)
        self.assertGreater(results[0].change_percentage, 0.0)

    def test_no_change_yields_nothing(self):
        mask = np.full((60, 80), 255, dtype=np.uint8)
        f0 = np.zeros((60, 80), dtype=np.uint8)
        f1 = np.zeros((60, 80), dtype=np.uint8)
        results = detect_motion_scaled(
            [(0, f0), (30, f1)], mask, threshold=30, min_area=1.0, timestamp_fn=self._ts
        )
        self.assertEqual(results, [])


if __name__ == "__main__":
    unittest.main()
