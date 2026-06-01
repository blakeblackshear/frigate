"""Tests for motion search batch helpers (runs + timestamp mapping)."""

import unittest
from dataclasses import dataclass

from frigate.jobs.motion_search_batch import (
    build_segment_time_map,
    coalesce_runs,
    stream_time_to_absolute,
)


@dataclass
class _Seg:
    path: str
    start_time: float
    end_time: float


def _run_seconds(run):
    return float(run[-1].end_time) - float(run[0].start_time)


class TestCoalesceRuns(unittest.TestCase):
    def test_contiguous_segments_form_one_run(self):
        segs = [_Seg("a", 0.0, 10.0), _Seg("b", 10.0, 20.0), _Seg("c", 20.0, 30.0)]
        runs = coalesce_runs(segs, max_seconds=600.0, epsilon=0.5)
        self.assertEqual(len(runs), 1)
        self.assertEqual(len(runs[0]), 3)

    def test_time_gap_splits_runs(self):
        # b ends 20, c starts 25 -> 5s gap > epsilon -> two runs.
        segs = [_Seg("a", 0.0, 10.0), _Seg("b", 10.0, 20.0), _Seg("c", 25.0, 35.0)]
        runs = coalesce_runs(segs, max_seconds=600.0, epsilon=0.5)
        self.assertEqual([len(r) for r in runs], [2, 1])

    def test_max_duration_caps_a_run(self):
        # Five contiguous 10s segments, cap 25s.
        segs = [_Seg(str(i), i * 10.0, i * 10.0 + 10.0) for i in range(5)]
        runs = coalesce_runs(segs, max_seconds=25.0, epsilon=0.5)
        self.assertTrue(all(_run_seconds(r) <= 30.0 for r in runs))
        self.assertEqual(sum(len(r) for r in runs), 5)

    def test_empty(self):
        self.assertEqual(coalesce_runs([], max_seconds=600.0, epsilon=0.5), [])


class TestTimestampMapping(unittest.TestCase):
    def test_gapfree_run_maps_to_start_plus_pts(self):
        run = [_Seg("a", 1000.0, 1010.0), _Seg("b", 1010.0, 1020.0)]
        time_map = build_segment_time_map(run)
        self.assertAlmostEqual(stream_time_to_absolute(time_map, 3.0), 1003.0)
        self.assertAlmostEqual(stream_time_to_absolute(time_map, 12.0), 1012.0)

    def test_past_end_clamps(self):
        run = [_Seg("a", 1000.0, 1010.0)]
        time_map = build_segment_time_map(run)
        self.assertAlmostEqual(stream_time_to_absolute(time_map, 9.9), 1009.9)
