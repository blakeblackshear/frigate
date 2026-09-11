"""Tests for the skipped detection rate and the notice it can raise."""

import unittest
from unittest.mock import patch

from frigate.stats import emitter
from frigate.stats.emitter import SkippedDetectionsTracker
from frigate.stats.util import skipped_percent


class TestSkippedPercent(unittest.TestCase):
    def test_share_of_all_frames(self):
        self.assertEqual(skipped_percent(0.5, 5.0, True), 10.0)

    def test_offline_camera_reports_zero(self):
        self.assertEqual(skipped_percent(2.0, 0.0, True), 0.0)

    def test_disabled_camera_reports_zero(self):
        self.assertEqual(skipped_percent(2.0, 5.0, False), 0.0)


class TestSkippedDetectionsTracker(unittest.TestCase):
    def _cameras(self, pct: float) -> dict:
        return {"front_door": {"skipped_pct": pct}}

    def test_below_threshold_never_qualifies(self):
        tracker = SkippedDetectionsTracker()

        for tick in range(10):
            self.assertEqual(tracker.update(self._cameras(4.9), tick * 15.0), [])

    def test_qualifies_once_after_the_hold(self):
        tracker = SkippedDetectionsTracker()

        results = [
            tracker.update(self._cameras(10.0), tick * 15.0) for tick in range(8)
        ]

        # ticks at 0, 15, 30, and 45 s are inside the hold; 60 s qualifies
        self.assertEqual(results[:4], [[], [], [], []])
        self.assertEqual(results[4], ["front_door"])
        self.assertEqual(results[5:], [[], [], []])

    def test_a_dip_restarts_the_hold(self):
        tracker = SkippedDetectionsTracker()

        for now, pct in ((0.0, 10.0), (15.0, 10.0), (30.0, 10.0), (45.0, 2.0)):
            self.assertEqual(tracker.update(self._cameras(pct), now), [])

        self.assertEqual(tracker.update(self._cameras(10.0), 60.0), [])
        self.assertEqual(tracker.update(self._cameras(10.0), 120.0), ["front_door"])

    def test_recovery_then_relapse_is_a_new_episode(self):
        tracker = SkippedDetectionsTracker()
        tracker.update(self._cameras(10.0), 0.0)
        self.assertEqual(tracker.update(self._cameras(10.0), 60.0), ["front_door"])

        tracker.update(self._cameras(0.0), 75.0)
        tracker.update(self._cameras(10.0), 90.0)

        self.assertEqual(tracker.update(self._cameras(10.0), 150.0), ["front_door"])

    def test_cameras_are_tracked_separately(self):
        tracker = SkippedDetectionsTracker()
        tracker.update({"a": {"skipped_pct": 10.0}, "b": {"skipped_pct": 0.0}}, 0.0)

        qualified = tracker.update(
            {"a": {"skipped_pct": 10.0}, "b": {"skipped_pct": 10.0}}, 60.0
        )

        self.assertEqual(qualified, ["a"])

    def test_a_removed_camera_starts_a_new_episode(self):
        tracker = SkippedDetectionsTracker()
        tracker.update(self._cameras(10.0), 0.0)
        tracker.update({}, 15.0)
        tracker.update(self._cameras(10.0), 30.0)

        self.assertEqual(tracker.update(self._cameras(10.0), 60.0), [])
        self.assertEqual(tracker.update(self._cameras(10.0), 90.0), ["front_door"])


class TestEmitterNotices(unittest.TestCase):
    def setUp(self):
        raise_patch = patch.object(emitter, "raise_notice")
        resolve_patch = patch.object(emitter, "resolve_notice")
        flush_patch = patch.object(emitter, "flush_notices")
        self.raise_notice = raise_patch.start()
        resolve_patch.start()
        self.flush_notices = flush_patch.start()
        self.addCleanup(raise_patch.stop)
        self.addCleanup(resolve_patch.stop)
        self.addCleanup(flush_patch.stop)

    def _emitter(self) -> emitter.StatsEmitter:
        stats_emitter = emitter.StatsEmitter.__new__(emitter.StatsEmitter)
        stats_emitter.skipped_detections = SkippedDetectionsTracker()
        stats_emitter._shm_checked = False
        stats_emitter._shm_params = None
        return stats_emitter

    def _stats(self, uptime: int, pct: float) -> dict:
        return {
            "service": {"uptime": uptime, "storage": {"/dev/shm": {}}},
            "cameras": {"front_door": {"skipped_pct": pct}},
        }

    def test_qualified_camera_raises_a_notice(self):
        stats_emitter = self._emitter()

        stats_emitter._update_notices(self._stats(300, 12.5), 0.0)
        stats_emitter._update_notices(self._stats(360, 12.5), 60.0)

        self.raise_notice.assert_called_once_with(
            "skipped_detections", scope="front_door", params={"pct": 12.5}
        )

    def test_startup_window_is_ignored(self):
        stats_emitter = self._emitter()

        stats_emitter._update_notices(self._stats(30, 50.0), 0.0)
        stats_emitter._update_notices(self._stats(90, 50.0), 60.0)

        self.raise_notice.assert_not_called()

    def test_every_tick_flushes_held_repeats(self):
        self._emitter()._update_notices(self._stats(30, 0.0), 0.0)

        self.flush_notices.assert_called_once_with()
