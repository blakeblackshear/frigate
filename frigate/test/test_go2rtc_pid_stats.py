"""Tests for resolving the go2rtc pid from cpu usages."""

import unittest

from frigate.stats.util import get_go2rtc_pid


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
