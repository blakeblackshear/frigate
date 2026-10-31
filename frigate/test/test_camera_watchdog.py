"""Tests for per stream recording health tracking in the camera watchdog."""

import os
import subprocess as sp
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, call, patch

from frigate.config import FrigateConfig
from frigate.const import DIRECTORY_SEGMENT_END, STREAM_TYPE_MAIN, STREAM_TYPE_SUB
from frigate.video.ffmpeg import CameraCaptureRunner, CameraWatchdog


def build_watchdog(
    sub_enabled: bool = True, output_args: dict | None = None
) -> CameraWatchdog:
    config = FrigateConfig(
        **{
            "mqtt": {"host": "mqtt"},
            "cameras": {
                "front_door": {
                    "ffmpeg": {
                        "output_args": output_args or {},
                        "inputs": [
                            {
                                "path": "rtsp://10.0.0.1:554/video",
                                "roles": ["record"],
                            },
                            {
                                "path": "rtsp://10.0.0.1:554/video2",
                                "roles": ["detect", "record_sub"],
                            },
                        ],
                    },
                    "record": {
                        "enabled": True,
                        "sub": {"enabled": sub_enabled},
                    },
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


class TestCameraWatchdogStreamHealth(unittest.TestCase):
    def _build_watchdog(
        self, sub_enabled: bool = True, output_args: dict | None = None
    ) -> CameraWatchdog:
        return build_watchdog(sub_enabled, output_args)

    def test_stale_sub_does_not_mark_main_stale(self):
        watchdog = self._build_watchdog()
        now = datetime.now().astimezone(UTC)
        stale = (now - timedelta(hours=1)).timestamp()

        watchdog.latest_cache_segment_time[STREAM_TYPE_MAIN] = now.timestamp()
        watchdog.latest_valid_segment_time[STREAM_TYPE_MAIN] = now.timestamp()
        watchdog.latest_cache_segment_time[STREAM_TYPE_SUB] = stale
        watchdog.latest_valid_segment_time[STREAM_TYPE_SUB] = stale

        assert watchdog._stream_staleness(STREAM_TYPE_MAIN, now) is None
        assert watchdog._stream_staleness(STREAM_TYPE_SUB, now) is not None

    def test_stale_main_does_not_mark_sub_stale(self):
        watchdog = self._build_watchdog()
        now = datetime.now().astimezone(UTC)
        stale = (now - timedelta(hours=1)).timestamp()

        watchdog.latest_cache_segment_time[STREAM_TYPE_MAIN] = stale
        watchdog.latest_valid_segment_time[STREAM_TYPE_MAIN] = stale
        watchdog.latest_cache_segment_time[STREAM_TYPE_SUB] = now.timestamp()
        watchdog.latest_valid_segment_time[STREAM_TYPE_SUB] = now.timestamp()

        assert watchdog._stream_staleness(STREAM_TYPE_MAIN, now) is not None
        assert watchdog._stream_staleness(STREAM_TYPE_SUB, now) is None

    def test_grace_period_suppresses_staleness(self):
        watchdog = self._build_watchdog()
        now = datetime.now().astimezone(UTC)
        watchdog.record_enable_time = now - timedelta(seconds=10)
        watchdog.latest_cache_segment_time[STREAM_TYPE_SUB] = (
            now - timedelta(hours=1)
        ).timestamp()

        assert watchdog._stream_staleness(STREAM_TYPE_SUB, now) is None

    def test_status_goes_to_the_matching_role_topic(self):
        watchdog = self._build_watchdog()

        watchdog.record_status[STREAM_TYPE_MAIN].send("online", 100.0)
        watchdog.record_status[STREAM_TYPE_SUB].send("offline", 100.0)

        watchdog.requestor.send_data.assert_any_call(
            "front_door/status/record", "online"
        )
        watchdog.requestor.send_data.assert_any_call(
            "front_door/status/record_sub", "offline"
        )

    def test_status_is_cached_per_stream(self):
        watchdog = self._build_watchdog()

        watchdog.record_status[STREAM_TYPE_MAIN].send("online", 100.0)
        watchdog.record_status[STREAM_TYPE_SUB].send("online", 100.0)
        watchdog.record_status[STREAM_TYPE_MAIN].send("online", 100.0)

        assert watchdog.requestor.send_data.call_count == 2

    def test_recorded_streams_follows_config(self):
        watchdog = self._build_watchdog()
        assert watchdog._recorded_streams(["record"]) == [STREAM_TYPE_MAIN]
        assert watchdog._recorded_streams(["detect", "record_sub"]) == [STREAM_TYPE_SUB]
        assert watchdog._recorded_streams(["detect"]) == []

        disabled = self._build_watchdog(sub_enabled=False)
        assert disabled._recorded_streams(["detect", "record_sub"]) == []

    def test_restart_grace_suppresses_repeat_staleness(self):
        watchdog = self._build_watchdog()
        now = datetime.now().astimezone(UTC)
        stale = (now - timedelta(hours=1)).timestamp()

        watchdog.latest_cache_segment_time[STREAM_TYPE_MAIN] = stale
        watchdog.latest_valid_segment_time[STREAM_TYPE_MAIN] = stale
        assert watchdog._stream_staleness(STREAM_TYPE_MAIN, now) is not None

        watchdog._grant_restart_grace([STREAM_TYPE_MAIN], now)

        assert watchdog._stream_staleness(STREAM_TYPE_MAIN, now) is None
        assert (
            watchdog._stream_staleness(STREAM_TYPE_MAIN, now + timedelta(seconds=89))
            is None
        )
        assert (
            watchdog._stream_staleness(STREAM_TYPE_MAIN, now + timedelta(seconds=91))
            is not None
        )

    def test_restart_grace_is_per_stream(self):
        watchdog = self._build_watchdog()
        now = datetime.now().astimezone(UTC)
        stale = (now - timedelta(hours=1)).timestamp()

        for stream_type in (STREAM_TYPE_MAIN, STREAM_TYPE_SUB):
            watchdog.latest_cache_segment_time[stream_type] = stale
            watchdog.latest_valid_segment_time[stream_type] = stale

        watchdog._grant_restart_grace([STREAM_TYPE_MAIN], now)

        assert watchdog._stream_staleness(STREAM_TYPE_MAIN, now) is None
        assert watchdog._stream_staleness(STREAM_TYPE_SUB, now) is not None

    def test_detect_reset_grants_the_shared_sub_stream_grace(self):
        watchdog = self._build_watchdog()
        watchdog.detect_process_records_sub = True
        watchdog.ffmpeg_detect_process = MagicMock()
        watchdog.capture_thread = MagicMock()
        watchdog.capture_thread.is_alive.return_value = False
        watchdog.start_ffmpeg_detect = MagicMock()

        now = datetime.now().astimezone(UTC)
        stale = (now - timedelta(hours=1)).timestamp()
        watchdog.latest_cache_segment_time[STREAM_TYPE_SUB] = stale
        watchdog.latest_valid_segment_time[STREAM_TYPE_SUB] = stale
        assert watchdog._stream_staleness(STREAM_TYPE_SUB, now) is not None

        watchdog.reset_capture_thread(terminate=False)

        # the sub check runs later in the same tick against a stale can_restart,
        # so without this grace it would kill the just-restarted process again
        assert (
            watchdog._stream_staleness(STREAM_TYPE_SUB, datetime.now().astimezone(UTC))
            is None
        )

    def test_detect_reset_leaves_sub_alone_when_not_shared(self):
        watchdog = self._build_watchdog()
        watchdog.detect_process_records_sub = False
        watchdog.ffmpeg_detect_process = MagicMock()
        watchdog.capture_thread = MagicMock()
        watchdog.capture_thread.is_alive.return_value = False
        watchdog.start_ffmpeg_detect = MagicMock()

        now = datetime.now().astimezone(UTC)
        stale = (now - timedelta(hours=1)).timestamp()
        watchdog.latest_cache_segment_time[STREAM_TYPE_SUB] = stale
        watchdog.latest_valid_segment_time[STREAM_TYPE_SUB] = stale

        watchdog.reset_capture_thread(terminate=False)

        assert (
            watchdog._stream_staleness(STREAM_TYPE_SUB, datetime.now().astimezone(UTC))
            is not None
        )

    def test_stale_threshold_follows_each_stream_segment_time(self):
        watchdog = self._build_watchdog(
            output_args={
                "record": "-f segment -segment_time 10 -c copy",
                "record_sub": "-f segment -segment_time 60 -c copy",
            }
        )

        assert watchdog.record_stale_threshold[STREAM_TYPE_MAIN] == 120
        assert watchdog.record_stale_threshold[STREAM_TYPE_SUB] == 150


def build_directory_watchdog(directory: str) -> CameraWatchdog:
    labelmap = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "labelmap.txt")
    )
    config = FrigateConfig(
        **{
            "mqtt": {"host": "mqtt"},
            "models": [{"devices": ["zmq"], "labelmap_path": labelmap}],
            "cameras": {
                "back": {
                    "ffmpeg": {
                        "inputs": [{"path": f"directory:{directory}"}],
                    },
                    "detect": {"height": 720, "width": 1280, "fps": 5},
                }
            },
        }
    )
    camera_config = config.cameras["back"]

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

    watchdog.stop_event.is_set.return_value = False
    watchdog.directory_importer.stable_seconds = 0
    return watchdog


def _write_clip(directory: str, name: str, payload: bytes, mtime: int) -> str:
    path = os.path.join(directory, name)
    with open(path, "wb") as file:
        file.write(payload)
    os.utime(path, (mtime, mtime))
    return path


class TestDirectoryWatchdog(unittest.TestCase):
    def test_empty_directory_does_not_count_as_a_crash(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            watchdog = build_directory_watchdog(directory)
            watchdog.reconnects.value = 0

            with (
                patch("frigate.video.ffmpeg.start_or_restart_ffmpeg") as start,
                patch.object(watchdog.logger, "error") as error,
            ):
                handled = watchdog._service_directory_input(1_000)

            self.assertTrue(handled)
            self.assertIsNone(watchdog.ffmpeg_detect_process)
            self.assertEqual(watchdog.reconnects.value, 0)
            start.assert_not_called()
            error.assert_not_called()

    def test_clean_exit_deletes_file_and_plays_the_next(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            older = _write_clip(directory, "a.mp4", b"older", 1_000)
            newer = _write_clip(directory, "b.mp4", b"newer", 2_000)
            watchdog = build_directory_watchdog(directory)
            watchdog.directory_importer.next_file(10_000)
            watchdog.reconnects.value = 4
            process = MagicMock()
            process.pid = 42
            process.poll.return_value = 0
            process.returncode = 0

            with (
                patch(
                    "frigate.video.ffmpeg.start_or_restart_ffmpeg",
                    return_value=process,
                ) as start,
                patch.object(CameraCaptureRunner, "start"),
            ):
                watchdog.start_ffmpeg_detect()
                played = start.call_args_list[0].args[0]
                self.assertIn(older, played)
                self.assertNotIn(f"directory:{directory}", played)

                watchdog.capture_thread.frames_read = 3
                watchdog._service_directory_input(20_000)

            self.assertFalse(os.path.exists(older))
            self.assertEqual(watchdog.current_directory_file, newer)
            self.assertEqual(watchdog.reconnects.value, 4)
            sentinel = watchdog.frame_queue.put.call_args.args[0]
            self.assertEqual(sentinel[0], DIRECTORY_SEGMENT_END)
            watchdog.logpipe.clear.assert_called()
            watchdog.logpipe.dump.assert_not_called()

    def test_failed_exit_moves_file_to_failed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            clip = _write_clip(directory, "a.mp4", b"bad", 1_000)
            watchdog = build_directory_watchdog(directory)
            watchdog.directory_importer.next_file(10_000)
            process = MagicMock()
            process.pid = 7
            process.poll.return_value = 1
            process.returncode = 1

            with (
                patch(
                    "frigate.video.ffmpeg.start_or_restart_ffmpeg",
                    return_value=process,
                ),
                patch.object(CameraCaptureRunner, "start"),
            ):
                watchdog.start_ffmpeg_detect()
                watchdog.capture_thread.frames_read = 0
                watchdog._service_directory_input(20_000)

            self.assertFalse(os.path.exists(clip))
            self.assertTrue(os.path.exists(os.path.join(directory, "failed", "a.mp4")))
            watchdog.frame_queue.put.assert_not_called()
            watchdog.logpipe.dump.assert_called()
            watchdog.logpipe.clear.assert_not_called()

    def test_abort_moves_the_current_file_to_failed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            clip = _write_clip(directory, "a.mp4", b"stalled", 1_000)
            watchdog = build_directory_watchdog(directory)
            watchdog.directory_importer.next_file(10_000)
            process = MagicMock()
            process.pid = 9
            process.poll.side_effect = [None, -15]
            process.returncode = -15
            process.wait.return_value = -15

            with (
                patch(
                    "frigate.video.ffmpeg.start_or_restart_ffmpeg",
                    return_value=process,
                ),
                patch.object(CameraCaptureRunner, "start"),
            ):
                watchdog.start_ffmpeg_detect()
                watchdog.capture_thread.frames_read = 4
                watchdog._abort_directory_playback()

            self.assertFalse(os.path.exists(clip))
            failed = os.path.join(directory, "failed", "a.mp4")
            self.assertTrue(os.path.exists(failed))
            sentinel = watchdog.frame_queue.put.call_args.args[0]
            self.assertEqual(sentinel[0], DIRECTORY_SEGMENT_END)

    def test_stop_leaves_the_file_in_place(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            clip = _write_clip(directory, "a.mp4", b"keep", 1_000)
            watchdog = build_directory_watchdog(directory)
            watchdog.current_directory_file = clip

            watchdog.stop_all_ffmpeg()

            self.assertTrue(os.path.exists(clip))
            self.assertIsNone(watchdog.current_directory_file)
