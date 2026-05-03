"""Tests for the shared ffmpeg progress helper."""

import subprocess as sp
import unittest
from unittest.mock import MagicMock, patch

from frigate.util.ffmpeg import inject_progress_flags, run_ffmpeg_with_progress


class TestInjectProgressFlags(unittest.TestCase):
    def test_inserts_flags_before_output_path(self):
        cmd = ["ffmpeg", "-i", "in.mp4", "-c", "copy", "out.mp4"]
        result = inject_progress_flags(cmd)
        self.assertEqual(
            result,
            ["ffmpeg", "-i", "in.mp4", "-c", "copy", "-progress", "pipe:2", "-nostats", "out.mp4"],
        )

    def test_empty_cmd_returns_empty(self):
        self.assertEqual(inject_progress_flags([]), [])


class TestRunFfmpegWithProgress(unittest.TestCase):
    def _make_fake_proc(self, stderr_lines, returncode=0):
        proc = MagicMock()
        proc.stderr = iter(stderr_lines)
        proc.stdin = MagicMock()
        proc.returncode = returncode
        proc.wait = MagicMock()
        return proc

    def test_emits_percent_from_out_time_us_lines(self):
        captured: list[float] = []

        def on_progress(percent: float) -> None:
            captured.append(percent)

        stderr_lines = [
            "out_time_us=1000000\n",
            "out_time_us=5000000\n",
            "progress=end\n",
        ]
        proc = self._make_fake_proc(stderr_lines)
        proc.stderr = MagicMock()
        proc.stderr.__iter__ = lambda self: iter(stderr_lines)
        proc.stderr.read = MagicMock(return_value="")

        with patch("subprocess.Popen", return_value=proc):
            returncode, _stderr = run_ffmpeg_with_progress(
                ["ffmpeg", "-i", "in", "out"],
                expected_duration_seconds=10.0,
                on_progress=on_progress,
                use_low_priority=False,
            )

        self.assertEqual(returncode, 0)
        self.assertEqual(len(captured), 4)  # initial 0.0 + two parsed + final 100.0
        self.assertAlmostEqual(captured[0], 0.0)
        self.assertAlmostEqual(captured[1], 10.0)
        self.assertAlmostEqual(captured[2], 50.0)
        self.assertAlmostEqual(captured[3], 100.0)

    def test_passes_started_process_to_callback(self):
        proc = self._make_fake_proc([])
        proc.stderr = MagicMock()
        proc.stderr.__iter__ = lambda self: iter([])
        proc.stderr.read = MagicMock(return_value="")

        seen: list = []

        with patch("subprocess.Popen", return_value=proc):
            run_ffmpeg_with_progress(
                ["ffmpeg", "out"],
                expected_duration_seconds=1.0,
                process_started=lambda p: seen.append(p),
                use_low_priority=False,
            )

        self.assertEqual(seen, [proc])

    def test_clamps_percent_to_0_100(self):
        captured: list[float] = []

        def on_progress(percent: float) -> None:
            captured.append(percent)

        stderr_lines = ["out_time_us=999999999999\n"]
        proc = self._make_fake_proc(stderr_lines)
        proc.stderr = MagicMock()
        proc.stderr.__iter__ = lambda self: iter(stderr_lines)
        proc.stderr.read = MagicMock(return_value="")

        with patch("subprocess.Popen", return_value=proc):
            run_ffmpeg_with_progress(
                ["ffmpeg", "out"],
                expected_duration_seconds=10.0,
                on_progress=on_progress,
                use_low_priority=False,
            )

        # initial 0.0 then a clamped reading
        self.assertEqual(captured[-1], 100.0)
