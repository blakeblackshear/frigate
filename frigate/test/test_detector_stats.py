"""Tests for per-detector stats."""

import unittest
from unittest.mock import MagicMock, patch

from frigate.stats.util import fold_run_duty_cycles, get_detector_stats


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


def _duty_detector(detector_type: str, duty: float) -> MagicMock:
    detector = MagicMock()
    detector.detector_config.type = detector_type
    detector.run_duty_cycle.value = duty
    return detector


class TestFoldRunDutyCycles(unittest.TestCase):
    """Duty cycles fold into polled NPU entries, creating duty-only ones."""

    def test_polled_entry_gets_the_duty_folded_in(self):
        stats = {"npu_usages": {"axelera": {"mem": "-%", "temp": 44.5}}}
        detectors = {"axelera:0": _duty_detector("axelera", 43.08)}

        fold_run_duty_cycles(stats, detectors)

        self.assertEqual(
            stats["npu_usages"]["axelera"], {"mem": "-%", "temp": 44.5, "npu": 43.1}
        )

    def test_missing_polled_entry_creates_a_duty_only_entry(self):
        # a failed hardware poll (temperature read) hides the entry for an
        # hour; the detector-process duty cycle is still valid
        stats = {}
        detectors = {"axelera:0": _duty_detector("axelera", 43.08)}

        fold_run_duty_cycles(stats, detectors)

        self.assertEqual(stats["npu_usages"]["axelera"], {"npu": 43.1})

    def test_several_processes_share_the_busiest_window(self):
        stats = {}
        detectors = {
            "axelera:0": _duty_detector("axelera", 12.0),
            "axelera:1": _duty_detector("axelera", 34.5),
            "coral:0": _duty_detector("edgetpu", 90.0),
        }

        fold_run_duty_cycles(stats, detectors)

        self.assertEqual(stats["npu_usages"]["axelera"]["npu"], 34.5)
        self.assertEqual(stats["npu_usages"]["edgetpu"]["npu"], 90.0)

    def test_negative_sentinel_is_ignored(self):
        # -1.0 means "no window yet"; a restarting detector must not wipe
        # the last published value
        stats = {"npu_usages": {"axelera": {"npu": 7.9}}}
        detectors = {"axelera:0": _duty_detector("axelera", -1.0)}

        fold_run_duty_cycles(stats, detectors)

        self.assertEqual(stats["npu_usages"]["axelera"]["npu"], 7.9)


if __name__ == "__main__":
    unittest.main()
