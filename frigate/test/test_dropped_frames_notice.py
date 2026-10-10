"""Tests for the notice raised when object processing drops camera frames."""

import unittest
from unittest.mock import patch

from frigate.const import REPLAY_CAMERA_PREFIX
from frigate.notices.types import NOTICE_KINDS
from frigate.video.detect import (
    DROPPED_FRAMES_NOTICE_COUNT,
    DROPPED_FRAMES_NOTICE_INTERVAL_S,
    DROPPED_FRAMES_WINDOW_S,
    DroppedFrameTracker,
)


class TestDroppedFrameTracker(unittest.TestCase):
    def setUp(self):
        raise_patch = patch("frigate.video.detect.raise_notice")
        self.raise_notice = raise_patch.start()
        self.addCleanup(raise_patch.stop)

    def _drop(self, tracker: DroppedFrameTracker, count: int, start: float) -> None:
        for i in range(count):
            tracker.dropped(start + i * 0.2)

    def test_kind_is_registered(self):
        self.assertIn("object_processing_behind", NOTICE_KINDS)

    def test_a_few_drops_raise_nothing(self):
        tracker = DroppedFrameTracker("front_door")

        self._drop(tracker, DROPPED_FRAMES_NOTICE_COUNT - 1, 0.0)

        self.raise_notice.assert_not_called()

    def test_enough_drops_raise_the_notice(self):
        tracker = DroppedFrameTracker("front_door")

        self._drop(tracker, DROPPED_FRAMES_NOTICE_COUNT, 0.0)

        self.raise_notice.assert_called_once_with("object_processing_behind")

    def test_drops_outside_the_window_do_not_add_up(self):
        tracker = DroppedFrameTracker("front_door")

        for i in range(DROPPED_FRAMES_NOTICE_COUNT):
            tracker.dropped(i * (DROPPED_FRAMES_WINDOW_S + 1.0))

        self.raise_notice.assert_not_called()

    def test_repeats_wait_for_the_interval(self):
        tracker = DroppedFrameTracker("front_door")

        self._drop(tracker, DROPPED_FRAMES_NOTICE_COUNT, 0.0)
        self._drop(tracker, DROPPED_FRAMES_NOTICE_COUNT * 2, 5.0)
        self.assertEqual(self.raise_notice.call_count, 1)

        self._drop(
            tracker, DROPPED_FRAMES_NOTICE_COUNT, DROPPED_FRAMES_NOTICE_INTERVAL_S
        )
        self.assertEqual(self.raise_notice.call_count, 2)

    def test_replay_camera_never_raises(self):
        tracker = DroppedFrameTracker(f"{REPLAY_CAMERA_PREFIX}front_door")

        self._drop(tracker, DROPPED_FRAMES_NOTICE_COUNT * 2, 0.0)

        self.raise_notice.assert_not_called()


if __name__ == "__main__":
    unittest.main()
