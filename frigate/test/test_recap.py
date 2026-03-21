import unittest
from unittest.mock import patch

import numpy as np

from frigate.recap.recap import (
    _balance_groups,
    _build_background,
    _draw_label,
    _interpolate_path,
    _make_spotlight,
    _mask_centroid,
    _person_mask,
    _relative_box_to_pixels,
)


class TestRelativeBoxConversion(unittest.TestCase):
    def test_basic(self):
        x1, y1, x2, y2 = _relative_box_to_pixels([0.5, 0.25, 0.1, 0.2], 1920, 1080)
        self.assertEqual(x1, 960)
        self.assertEqual(y1, 270)
        self.assertEqual(x2, 1152)
        self.assertEqual(y2, 486)

    def test_clamps(self):
        _, _, x2, y2 = _relative_box_to_pixels([0.9, 0.9, 0.2, 0.2], 100, 100)
        self.assertEqual(x2, 100)
        self.assertEqual(y2, 100)

    def test_full_frame(self):
        x1, y1, x2, y2 = _relative_box_to_pixels([0.0, 0.0, 1.0, 1.0], 1920, 1080)
        self.assertEqual((x1, y1, x2, y2), (0, 0, 1920, 1080))

    def test_real_frigate_data(self):
        x1, y1, x2, y2 = _relative_box_to_pixels([0.65, 0.117, 0.025, 0.089], 640, 360)
        self.assertEqual(x1, 416)
        self.assertEqual(y1, 42)
        self.assertGreater(x2, x1)
        self.assertGreater(y2, y1)


class TestSpotlight(unittest.TestCase):
    def test_shape_and_range(self):
        sl = _make_spotlight(100, 100, 50, 50, 20, 20)
        self.assertEqual(sl.shape, (100, 100))
        self.assertGreater(sl[50, 50], 0.5)
        self.assertAlmostEqual(sl[0, 0], 0.0, places=1)

    def test_off_center(self):
        sl = _make_spotlight(200, 200, 10, 10, 15, 15)
        self.assertGreater(sl[10, 10], 0.5)
        self.assertAlmostEqual(sl[199, 199], 0.0, places=1)


class TestPersonMask(unittest.TestCase):
    def test_identical_frames_empty_mask(self):
        frame = np.full((100, 100, 3), 128, np.uint8)
        ref = frame.copy()
        sl = _make_spotlight(100, 100, 50, 50, 30, 30)
        mask = _person_mask(frame, ref, sl)
        self.assertEqual(mask.sum(), 0.0)

    def test_different_region_shows_fg(self):
        ref = np.full((100, 100, 3), 50, np.uint8)
        frame = ref.copy()
        frame[40:60, 40:60] = 200  # person-sized bright block
        sl = _make_spotlight(100, 100, 50, 50, 30, 30)
        mask = _person_mask(frame, ref, sl)
        self.assertGreater(mask[50, 50], 0.0)


class TestMaskCentroid(unittest.TestCase):
    def test_centered_blob(self):
        m = np.zeros((100, 100), np.float32)
        m[40:60, 40:60] = 1.0
        cx, cy = _mask_centroid(m)
        self.assertAlmostEqual(cx, 50, delta=2)
        self.assertAlmostEqual(cy, 50, delta=2)

    def test_empty_mask(self):
        m = np.zeros((100, 100), np.float32)
        self.assertIsNone(_mask_centroid(m))


class TestInterpolatePath(unittest.TestCase):
    def test_empty(self):
        self.assertIsNone(_interpolate_path([], 1.0, 100, 100))
        self.assertIsNone(_interpolate_path(None, 1.0, 100, 100))

    def test_midpoint(self):
        path = [((0.0, 0.0), 10.0), ((1.0, 1.0), 20.0)]
        self.assertEqual(_interpolate_path(path, 15.0, 100, 100), (50, 50))

    def test_before_first(self):
        path = [((0.25, 0.75), 10.0), ((0.5, 0.5), 20.0)]
        self.assertEqual(_interpolate_path(path, 5.0, 100, 100), (25, 75))

    def test_after_last(self):
        path = [((0.1, 0.2), 10.0), ((0.3, 0.4), 20.0)]
        self.assertEqual(_interpolate_path(path, 30.0, 1000, 1000), (300, 400))

    def test_real_path(self):
        path = [
            ([0.6219, 0.2028], 1774057715.808),
            ([0.6297, 0.2028], 1774057716.008),
            ([0.7078, 0.2167], 1774057720.019),
        ]
        pos = _interpolate_path(path, 1774057718.0, 640, 360)
        self.assertIsNotNone(pos)
        self.assertGreater(pos[0], int(0.6297 * 640))
        self.assertLess(pos[0], int(0.7078 * 640))


class TestDrawLabel(unittest.TestCase):
    def test_draws(self):
        f = np.zeros((200, 300, 3), np.uint8)
        _draw_label(f, "12:34:56", 100, 100)
        self.assertFalse(np.all(f == 0))

    def test_edge(self):
        f = np.zeros((50, 50, 3), np.uint8)
        _draw_label(f, "test", 0, 5)
        self.assertFalse(np.all(f == 0))


class TestBalanceGroups(unittest.TestCase):
    def test_single_event(self):
        events = [{"frames": [1] * 10, "time": 0}]
        groups = _balance_groups(events, 3)
        self.assertEqual(len(groups), 1)
        self.assertEqual(len(groups[0]), 1)

    def test_even_split(self):
        events = [{"frames": [1] * 100, "time": i} for i in range(6)]
        groups = _balance_groups(events, 3)
        self.assertEqual(len(groups), 2)
        self.assertEqual(len(groups[0]), 3)
        self.assertEqual(len(groups[1]), 3)

    def test_long_events_spread(self):
        events = [
            {"frames": [1] * 500, "time": 0},
            {"frames": [1] * 400, "time": 1},
            {"frames": [1] * 10, "time": 2},
            {"frames": [1] * 10, "time": 3},
        ]
        groups = _balance_groups(events, 3)
        # long events should end up in different groups
        group_maxes = [max(len(e["frames"]) for e in g) for g in groups]
        self.assertIn(500, group_maxes)
        self.assertIn(400, group_maxes)

    def test_sorted_by_time(self):
        events = [
            {"frames": [1] * 10, "time": 30},
            {"frames": [1] * 10, "time": 10},
            {"frames": [1] * 10, "time": 20},
        ]
        groups = _balance_groups(events, 3)
        times = [e["time"] for e in groups[0]]
        self.assertEqual(times, sorted(times))


class TestBuildBackground(unittest.TestCase):
    @patch("frigate.recap.recap._extract_frame")
    @patch("frigate.recap.recap._probe_resolution")
    @patch("frigate.recap.recap._get_recording_at")
    def test_too_few(self, mock_rec, mock_probe, mock_extract):
        mock_rec.return_value = ("/fake.mp4", 0.0)
        mock_probe.return_value = (100, 100)
        mock_extract.return_value = None
        self.assertIsNone(_build_background("/usr/bin/ffmpeg", "cam", 0.0, 100.0, 10))

    @patch("frigate.recap.recap.os.path.isfile", return_value=True)
    @patch("frigate.recap.recap._extract_frame")
    @patch("frigate.recap.recap._probe_resolution")
    @patch("frigate.recap.recap._get_recording_at")
    def test_median(self, mock_rec, mock_probe, mock_extract, mock_isfile):
        mock_rec.return_value = ("/fake.mp4", 0.0)
        mock_probe.return_value = (4, 4)
        frames = [np.full((4, 4, 3), v, np.uint8) for v in [0, 100, 200]]
        idx = [0]

        def side_effect(*a, **kw):
            r = frames[idx[0] % 3]
            idx[0] += 1
            return r

        mock_extract.side_effect = side_effect
        result = _build_background("/usr/bin/ffmpeg", "cam", 0.0, 100.0, 5)
        self.assertIsNotNone(result)
        self.assertEqual(result[0, 0, 0], 100)


class TestRecapConfig(unittest.TestCase):
    def test_defaults(self):
        from frigate.config.recap import RecapConfig

        cfg = RecapConfig()
        self.assertFalse(cfg.enabled)
        self.assertEqual(cfg.default_label, "person")
        self.assertEqual(cfg.video_duration, 30)

    def test_validation(self):
        from pydantic import ValidationError

        from frigate.config.recap import RecapConfig

        with self.assertRaises(ValidationError):
            RecapConfig(ghost_duration=0.1)
        with self.assertRaises(ValidationError):
            RecapConfig(output_fps=60)
        with self.assertRaises(ValidationError):
            RecapConfig(video_duration=2)
        with self.assertRaises(ValidationError):
            RecapConfig(background_samples=2)


if __name__ == "__main__":
    unittest.main()
