"""Tests for DebugReplayManager state machine and async startup."""

import threading
import time
import unittest
import unittest.mock
from unittest.mock import MagicMock, patch

from frigate.debug_replay import DebugReplayManager, ReplayState


class TestDebugReplayManagerState(unittest.TestCase):
    def test_initial_state_is_idle(self):
        manager = DebugReplayManager()

        self.assertEqual(manager.state, ReplayState.idle)
        self.assertIsNone(manager.error_message)
        self.assertFalse(manager.active)

    def test_active_property_true_for_preparing_starting_and_active_states(self):
        manager = DebugReplayManager()

        manager._set_state(ReplayState.preparing_clip)
        self.assertTrue(manager.active)

        manager._set_state(ReplayState.starting_camera)
        self.assertTrue(manager.active)

        manager._set_state(ReplayState.active)
        self.assertTrue(manager.active)

    def test_active_property_false_for_idle_and_error_states(self):
        manager = DebugReplayManager()

        manager._set_state(ReplayState.idle)
        self.assertFalse(manager.active)

        manager._set_state(ReplayState.error, error_message="boom")
        self.assertFalse(manager.active)
        self.assertEqual(manager.error_message, "boom")


class TestDebugReplayManagerAsyncStart(unittest.TestCase):
    def setUp(self):
        self.manager = DebugReplayManager()
        self.frigate_config = MagicMock()
        self.frigate_config.cameras = {"front": MagicMock()}
        self.frigate_config.ffmpeg.ffmpeg_path = "/bin/true"
        self.publisher = MagicMock()

    def test_progress_percent_tracks_helper_callbacks(self):
        recordings_qs = MagicMock()
        recordings_qs.count.return_value = 1
        recordings_qs.__iter__.return_value = iter([MagicMock(path="/tmp/r1.mp4")])

        def fake_helper(cmd, *, expected_duration_seconds, on_progress, **kwargs):
            on_progress(0.0)
            on_progress(42.5)
            on_progress(100.0)
            return 0, ""

        with (
            patch.object(self.manager, "_query_recordings", return_value=recordings_qs),
            patch("frigate.debug_replay.run_ffmpeg_with_progress", side_effect=fake_helper),
            patch.object(self.manager, "_publish_replay_camera"),
            patch("os.path.exists", return_value=True),
            patch("os.makedirs"),
            patch("builtins.open", unittest.mock.mock_open()),
        ):
            self.manager.start(
                source_camera="front",
                start_ts=100.0,
                end_ts=200.0,
                frigate_config=self.frigate_config,
                config_publisher=self.publisher,
            )
            for _ in range(50):
                if self.manager.state == ReplayState.active:
                    break
                time.sleep(0.05)

        # Progress should have advanced through the callback values.
        self.assertEqual(self.manager.state, ReplayState.active)
        self.assertEqual(self.manager.progress_percent, 100.0)

    def test_start_returns_immediately_with_preparing_state(self):
        recordings_qs = MagicMock()
        recordings_qs.count.return_value = 1
        recordings_qs.__iter__.return_value = iter(
            [MagicMock(path="/tmp/r1.mp4")]
        )

        # Block the worker thread before it transitions out of preparing_clip.
        worker_can_proceed = threading.Event()

        def fake_helper(cmd, *, expected_duration_seconds, on_progress, **kwargs):
            worker_can_proceed.wait(timeout=5)
            return 0, ""

        with (
            patch.object(
                self.manager,
                "_query_recordings",
                return_value=recordings_qs,
            ),
            patch("frigate.debug_replay.run_ffmpeg_with_progress", side_effect=fake_helper),
            patch.object(self.manager, "_publish_replay_camera"),
            patch("os.path.exists", return_value=True),
            patch("os.makedirs"),
            patch("builtins.open", unittest.mock.mock_open()),
        ):
            replay_name = self.manager.start(
                source_camera="front",
                start_ts=100.0,
                end_ts=200.0,
                frigate_config=self.frigate_config,
                config_publisher=self.publisher,
            )

            # Returned synchronously
            self.assertTrue(replay_name.startswith("_replay_"))
            self.assertEqual(self.manager.state, ReplayState.preparing_clip)

            worker_can_proceed.set()

            # Wait for worker to finish
            for _ in range(50):
                if self.manager.state == ReplayState.active:
                    break
                time.sleep(0.05)
            self.assertEqual(self.manager.state, ReplayState.active)

    def test_start_rejects_concurrent_calls_with_value_error(self):
        recordings_qs = MagicMock()
        recordings_qs.count.return_value = 1
        recordings_qs.__iter__.return_value = iter([MagicMock(path="/tmp/r1.mp4")])

        block = threading.Event()

        def slow_helper(cmd, *, expected_duration_seconds, on_progress, **kwargs):
            block.wait(timeout=5)
            return 0, ""

        with (
            patch.object(self.manager, "_query_recordings", return_value=recordings_qs),
            patch("frigate.debug_replay.run_ffmpeg_with_progress", side_effect=slow_helper),
            patch.object(self.manager, "_publish_replay_camera"),
            patch("os.path.exists", return_value=True),
            patch("os.makedirs"),
            patch("builtins.open", unittest.mock.mock_open()),
        ):
            self.manager.start(
                source_camera="front",
                start_ts=100.0,
                end_ts=200.0,
                frigate_config=self.frigate_config,
                config_publisher=self.publisher,
            )

            with self.assertRaises(ValueError):
                self.manager.start(
                    source_camera="front",
                    start_ts=100.0,
                    end_ts=200.0,
                    frigate_config=self.frigate_config,
                    config_publisher=self.publisher,
                )

            block.set()

    def test_start_transitions_to_error_state_when_ffmpeg_fails(self):
        recordings_qs = MagicMock()
        recordings_qs.count.return_value = 1
        recordings_qs.__iter__.return_value = iter([MagicMock(path="/tmp/r1.mp4")])

        def failing_helper(cmd, *, expected_duration_seconds, on_progress, **kwargs):
            return 1, "ffmpeg exploded"

        with (
            patch.object(self.manager, "_query_recordings", return_value=recordings_qs),
            patch("frigate.debug_replay.run_ffmpeg_with_progress", side_effect=failing_helper),
            patch("os.path.exists", return_value=True),
            patch("os.makedirs"),
            patch("builtins.open", unittest.mock.mock_open()),
        ):
            self.manager.start(
                source_camera="front",
                start_ts=100.0,
                end_ts=200.0,
                frigate_config=self.frigate_config,
                config_publisher=self.publisher,
            )

            for _ in range(50):
                if self.manager.state == ReplayState.error:
                    break
                time.sleep(0.05)
            self.assertEqual(self.manager.state, ReplayState.error)
            self.assertIsNotNone(self.manager.error_message)
            self.assertIn("ffmpeg", self.manager.error_message.lower())


class TestDebugReplayManagerCancellation(unittest.TestCase):
    def test_stop_during_preparing_clip_terminates_ffmpeg(self):
        manager = DebugReplayManager()
        frigate_config = MagicMock()
        frigate_config.cameras = {"front": MagicMock()}
        frigate_config.ffmpeg.ffmpeg_path = "/bin/sh"
        publisher = MagicMock()

        recordings_qs = MagicMock()
        recordings_qs.count.return_value = 1
        recordings_qs.__iter__.return_value = iter([MagicMock(path="/tmp/r1.mp4")])

        terminated_event = threading.Event()
        fake_proc = MagicMock()
        original_terminate = MagicMock(side_effect=lambda: terminated_event.set())
        fake_proc.terminate = original_terminate

        def fake_helper(cmd, *, expected_duration_seconds, on_progress, process_started, **kwargs):
            if process_started is not None:
                process_started(fake_proc)
            # Block until stop() calls fake_proc.terminate()
            terminated_event.wait(timeout=5)
            return -15, "killed"

        with (
            patch.object(manager, "_query_recordings", return_value=recordings_qs),
            patch("frigate.debug_replay.run_ffmpeg_with_progress", side_effect=fake_helper),
            patch("os.path.exists", return_value=True),
            patch("os.makedirs"),
            patch("os.remove"),
            patch("builtins.open", unittest.mock.mock_open()),
        ):
            manager.start(
                source_camera="front",
                start_ts=100.0,
                end_ts=200.0,
                frigate_config=frigate_config,
                config_publisher=publisher,
            )
            # Wait for the worker to register the active process
            for _ in range(50):
                if manager._active_process is fake_proc:
                    break
                time.sleep(0.02)
            self.assertEqual(manager.state, ReplayState.preparing_clip)

            manager.stop(frigate_config=frigate_config, config_publisher=publisher)

            self.assertTrue(original_terminate.called, "terminate() should have been called")
            self.assertEqual(manager.state, ReplayState.idle)
