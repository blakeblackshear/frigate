"""Tests for per-detector stats."""

import unittest
from unittest.mock import MagicMock, patch

from frigate.stats.util import get_detector_stats


def _detector(detector_type: str) -> MagicMock:
    detector = MagicMock()
    detector.detector_config.type = detector_type
    detector.avg_inference_speed.value = 0.01
    detector.detection_start.value = 0.0
    detector.detect_process.pid = 1
    return detector


class TestDetectorTemperatures(unittest.TestCase):
    def test_repeated_device_shares_its_unit_temperature(self):
        stats_tracking = {
            "detectors": {
                "hailo:PCIe": _detector("hailo8l"),
                "hailo:PCIe#2": _detector("hailo8l"),
                "hailo:PCIe:1": _detector("hailo8l"),
            }
        }

        with patch(
            "frigate.stats.util.get_hardware_temperatures", return_value=[50.0, 60.0]
        ):
            stats = get_detector_stats(stats_tracking)

        self.assertEqual(stats["hailo:PCIe"]["temperature"], 50.0)
        self.assertEqual(stats["hailo:PCIe#2"]["temperature"], 50.0)
        self.assertEqual(stats["hailo:PCIe:1"]["temperature"], 60.0)


if __name__ == "__main__":
    unittest.main()
