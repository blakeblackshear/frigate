"""Tests for resolving the go2rtc pid from cpu usages."""

import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from frigate.stats.util import get_go2rtc_pid, stats_snapshot


class TestGo2rtcPid(unittest.TestCase):
    def test_finds_go2rtc_by_binary_path(self):
        cpu_usages = {
            "frigate.full_system": {"cpu": "1.0", "mem": "2.0"},
            "100": {"cmdline": "ffmpeg -i rtsp://127.0.0.1:8554/go2rtc_cam"},
            "200": {
                "cmdline": "/usr/local/go2rtc/bin/go2rtc -config=/dev/shm/go2rtc.yaml"
            },
            "300": {"cmdline": "frigate.recording"},
        }

        self.assertEqual(get_go2rtc_pid(cpu_usages), 200)

    def test_finds_custom_go2rtc_binary(self):
        self.assertEqual(get_go2rtc_pid({"42": {"cmdline": "/config/go2rtc"}}), 42)

    def test_returns_none_when_go2rtc_is_not_running(self):
        self.assertIsNone(get_go2rtc_pid({"100": {"cmdline": "ffmpeg -i x"}}))
        self.assertIsNone(get_go2rtc_pid({}))


class TestGo2rtcPidInSnapshot(unittest.TestCase):
    def snapshot(self, tracking: dict, go2rtc_pid: int) -> dict:
        def update_stats(stats: dict) -> None:
            stats["cpu_usages"] = {
                str(go2rtc_pid): {
                    "cmdline": "/usr/local/go2rtc/bin/go2rtc -config=x",
                    "cpu": str(go2rtc_pid / 100),
                    "mem": str(go2rtc_pid / 10),
                }
            }

        config = SimpleNamespace(
            cameras={},
            telemetry=SimpleNamespace(stats=SimpleNamespace(network_bandwidth=False)),
        )
        hardware_stats = Mock()
        hardware_stats.update_stats.side_effect = update_stats

        with (
            patch("frigate.stats.util.get_detector_stats", return_value={}),
            patch("frigate.stats.util.embeddings_stats", return_value={}),
            patch("frigate.stats.util.calculate_shm_requirements", return_value={}),
        ):
            return stats_snapshot(config, tracking, hardware_stats)

    def test_snapshot_follows_go2rtc_restart(self):
        tracking = {
            "camera_metrics": {},
            "detectors": {},
            "started": 0,
            "latest_frigate_version": "",
            "processes": {"go2rtc": 200, "recording": 50},
            "storage_maintainer": None,
        }

        first = self.snapshot(tracking, 200)["processes"]["go2rtc"]
        self.assertEqual(first, {"pid": 200, "cpu": "2.0", "mem": "20.0"})

        restarted = self.snapshot(tracking, 300)["processes"]["go2rtc"]
        self.assertEqual(restarted, {"pid": 300, "cpu": "3.0", "mem": "30.0"})
