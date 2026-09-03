"""Tests for the detector stuck notice raised by the Frigate watchdog."""

import unittest
from unittest.mock import MagicMock, patch

from frigate.watchdog import FrigateWatchdog


class TestDetectorStuckNotice(unittest.TestCase):
    def _stuck_detector(self) -> MagicMock:
        detector = MagicMock()
        detector.detection_start.value = 1.0
        detector.detect_process.is_alive.return_value = True
        return detector

    def test_stuck_restart_raises_notice(self):
        registry = MagicMock()
        detector = self._stuck_detector()
        watchdog = FrigateWatchdog({"ov": detector}, MagicMock(), registry)

        with patch("frigate.watchdog.datetime") as mock_datetime:
            mock_datetime.datetime.now.return_value.timestamp.return_value = 100.0
            watchdog._check_detectors()

        detector.start_or_restart.assert_called_once()
        registry.raise_notice.assert_called_once_with(
            "detector_stuck", scope="ov", params={"detector": "ov"}
        )

    def test_healthy_detector_raises_nothing(self):
        registry = MagicMock()
        detector = self._stuck_detector()
        detector.detection_start.value = 0.0
        watchdog = FrigateWatchdog({"ov": detector}, MagicMock(), registry)

        watchdog._check_detectors()

        registry.raise_notice.assert_not_called()
