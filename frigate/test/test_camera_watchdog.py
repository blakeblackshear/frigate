"""Tests for capture thread resets in the camera watchdog."""

import subprocess as sp
import unittest
from unittest.mock import MagicMock, call, patch

from frigate.config import FrigateConfig
from frigate.video.ffmpeg import CameraWatchdog


def build_watchdog() -> CameraWatchdog:
    config = FrigateConfig(
        **{
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["detect", "record"],
                            },
                        ],
                    },
                    "record": {"enabled": True},
                }
            },
        }
    )
    camera_config = config.cameras["front_door"]

    with (
        patch("frigate.video.ffmpeg.LogPipe"),
        patch("frigate.video.ffmpeg.InterProcessRequestor"),
        patch("frigate.video.ffmpeg.RecordingsDataSubscriber"),
        patch("frigate.video.ffmpeg.CameraConfigUpdateSubscriber"),
    ):
        watchdog = CameraWatchdog(
            camera_config,
            1,
            MagicMock(),
            MagicMock(),
            MagicMock(),
            MagicMock(),
            MagicMock(),
            MagicMock(),
            MagicMock(),
            MagicMock(),
        )

    return watchdog


class TestCameraWatchdogReset(unittest.TestCase):
    def _build_resettable_watchdog(self) -> CameraWatchdog:
        watchdog = build_watchdog()
        watchdog.ffmpeg_detect_process = MagicMock()
        watchdog.capture_thread = MagicMock()
        watchdog.capture_thread.is_alive.return_value = False
        watchdog.start_ffmpeg_detect = MagicMock()
        return watchdog

    def test_reset_does_not_buffer_raw_frames(self):
        watchdog = self._build_resettable_watchdog()
        process = watchdog.ffmpeg_detect_process

        watchdog.reset_capture_thread()

        process.terminate.assert_called_once()
        process.wait.assert_called_once_with(timeout=30)
        process.communicate.assert_not_called()
        watchdog.start_ffmpeg_detect.assert_called_once()

    def test_timed_out_reset_kills_and_reaps_without_reading_stdout(self):
        watchdog = self._build_resettable_watchdog()
        process = watchdog.ffmpeg_detect_process
        process.wait.side_effect = [sp.TimeoutExpired("ffmpeg", 30), 0]

        watchdog.reset_capture_thread()

        process.kill.assert_called_once()
        self.assertEqual(process.wait.call_args_list, [call(timeout=30), call()])
        process.communicate.assert_not_called()
        watchdog.start_ffmpeg_detect.assert_called_once()


if __name__ == "__main__":
    unittest.main()
