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

    def test_axelera_temperature_reads_the_board_controller(self):
        from frigate.stats.hardware import get_hardware_temperatures

        with patch("frigate.stats.hardware.get_axelera_board_temp", return_value=45.4):
            self.assertEqual(get_hardware_temperatures("axelera"), [45.4])

        with patch("frigate.stats.hardware.get_axelera_board_temp", return_value=None):
            self.assertEqual(get_hardware_temperatures("axelera"), [None])


class TestAxeleraBoardTempCooldown(unittest.TestCase):
    """A failed board read backs off instead of delaying every stats update."""

    def test_failed_read_starts_a_cooldown(self):
        import subprocess as sp

        import frigate.util.services as services

        with (
            patch.object(services, "_axelera_board_temp_cache", None),
            patch.object(services, "_axelera_board_temp_error_until", 0.0),
            patch("frigate.util.runtime_deps.find_tool", return_value="/bin/true"),
            patch.object(
                services.sp,
                "run",
                side_effect=sp.TimeoutExpired(cmd="axcmd", timeout=5),
            ) as run_mock,
        ):
            self.assertIsNone(services.get_axelera_board_temp())
            # the cooldown prevents the second update from paying the
            # blocking read cost again while the board is unresponsive
            self.assertIsNone(services.get_axelera_board_temp())

        self.assertEqual(run_mock.call_count, 1)


if __name__ == "__main__":
    unittest.main()
