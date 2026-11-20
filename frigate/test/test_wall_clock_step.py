"""Tests that watchdogs are not fooled by wall clock steps, such as an NTP sync at boot."""

import time
import unittest
from unittest.mock import MagicMock, patch

from frigate.stats.util import _monotonic_to_wall
from frigate.video.ffmpeg import CameraWatchdog
from frigate.watchdog import FrigateWatchdog


class TestDetectorWatchdogClock(unittest.TestCase):
    def test_inference_that_just_started_is_not_stuck(self):
        detector = MagicMock()
        detector.detection_start.value = time.monotonic()
        detector.detect_process.is_alive.return_value = True
        watchdog = FrigateWatchdog({"ov": detector}, MagicMock())

        with patch("frigate.watchdog.raise_notice") as raise_notice:
            watchdog._check_detectors()

        detector.start_or_restart.assert_not_called()
        raise_notice.assert_not_called()


class TestDetectionStartStats(unittest.TestCase):
    def test_idle_detector_reports_zero(self):
        self.assertEqual(_monotonic_to_wall(0.0), 0.0)

    def test_running_inference_reports_wall_clock_start(self):
        start = _monotonic_to_wall(time.monotonic() - 5)
        self.assertAlmostEqual(start, time.time() - 5, delta=0.5)


class TestCameraNoFramesCheck(unittest.TestCase):
    def setUp(self):
        self.watchdog = CameraWatchdog.__new__(CameraWatchdog)
        self.watchdog.capture_thread = MagicMock()
        self.watchdog.capture_thread.current_frame.value = 1000.0
        self.watchdog.last_frame_value = 0.0
        self.watchdog.last_frame_change = 0.0

    def test_new_frame_read_is_not_stalled(self):
        self.assertFalse(self.watchdog._no_frames_received(50.0))

    def test_wall_clock_step_is_not_stalled(self):
        self.watchdog._no_frames_received(50.0)

        # the capture thread stamps frames with wall clock time, which just
        # jumped 44 minutes forward
        self.watchdog.capture_thread.current_frame.value = 1000.0 + 2640
        self.assertFalse(self.watchdog._no_frames_received(51.0))

    def test_unchanged_frame_for_timeout_is_stalled(self):
        self.watchdog._no_frames_received(50.0)

        self.assertFalse(self.watchdog._no_frames_received(70.0))
        self.assertTrue(self.watchdog._no_frames_received(70.5))


if __name__ == "__main__":
    unittest.main()
