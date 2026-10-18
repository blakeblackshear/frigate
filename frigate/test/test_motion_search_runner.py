"""Tests for motion search run decoding and truncation checks."""

import threading
import unittest
from types import SimpleNamespace
from unittest import mock

import numpy as np

from frigate.jobs.motion_search import MotionSearchJob, MotionSearchRunner

# Two contiguous 10 s segments, so the run's stream is 20 s long.
RUN = [
    SimpleNamespace(start_time=1000.0, end_time=1010.0),
    SimpleNamespace(start_time=1010.0, end_time=1020.0),
]
FRAME = np.zeros((2, 2), dtype=np.uint8)


class TestProcessRun(unittest.TestCase):
    def setUp(self):
        requestor = mock.patch("frigate.jobs.motion_search.InterProcessRequestor")
        requestor.start()
        self.addCleanup(requestor.stop)

        self.runner = MotionSearchRunner(
            MotionSearchJob(camera="cam"), mock.Mock(), threading.Event()
        )
        self.runner.fps_rate = 2.0
        self.runner._detect_with_progress = mock.Mock(return_value=[])

    def _process(self, kf_pts, keyframe_frames, cadence_frames):
        def frames(*args, skip_nonkey, fps_rate):
            count = keyframe_frames if skip_nonkey else cadence_frames
            return iter([FRAME] * count)

        with (
            mock.patch(
                "frigate.jobs.motion_search.probe_vod_keyframe_pts",
                return_value=kf_pts,
            ),
            mock.patch(
                "frigate.jobs.motion_search.iter_vod_frames", side_effect=frames
            ) as decode,
        ):
            result = self.runner._process_run(RUN)
        return result, [c.kwargs["skip_nonkey"] for c in decode.call_args_list]

    def test_complete_keyframe_probe_pairs_timestamps(self):
        pts = [0.5, 2.5, 4.5, 6.5, 8.5, 10.5, 12.5, 14.5, 16.5, 18.5]
        (_, frames), modes = self._process(pts, len(pts), 0)

        self.assertEqual(frames, len(pts))
        self.assertEqual(modes, [True])
        ts_fn = self.runner._detect_with_progress.call_args.args[1]
        self.assertAlmostEqual(ts_fn(5), 1010.5)

    def test_keyframe_probe_gap_falls_back_to_cadence(self):
        # Probe lost the second segment; an equal decode count must not be trusted.
        pts = [0.5, 2.5, 4.5, 6.5, 8.5]
        (_, frames), modes = self._process(pts, len(pts), 40)

        self.assertEqual(modes, [False])
        self.assertEqual(frames, 40)

    def test_cadence_shortfall_raises(self):
        self.runner.use_keyframe = False
        with self.assertRaises(RuntimeError):
            self._process([], 0, 20)

    def test_zero_frames_raises(self):
        self.runner.use_keyframe = False
        with self.assertRaises(RuntimeError):
            self._process([], 0, 0)

    def test_small_cadence_drift_is_tolerated(self):
        self.runner.use_keyframe = False
        (_, frames), _ = self._process([], 0, 38)
        self.assertEqual(frames, 38)

    def test_shortfall_after_stop_does_not_raise(self):
        self.runner.use_keyframe = False
        self.runner.cancel_event.set()
        (_, frames), _ = self._process([], 0, 3)
        self.assertEqual(frames, 3)
