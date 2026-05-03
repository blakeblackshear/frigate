"""Tests for the debug replay job runner and factory."""

import threading
import time
import unittest
import unittest.mock
from unittest.mock import MagicMock, patch

from frigate.debug_replay import DebugReplayManager
from frigate.jobs.debug_replay import (
    DebugReplayJob,
    cancel_debug_replay_job,
    get_active_runner,
    start_debug_replay_job,
)
from frigate.jobs.export import JobStatePublisher
from frigate.jobs.manager import _completed_jobs, _current_jobs
from frigate.types import JobStatusTypesEnum


def _reset_job_manager() -> None:
    """Clear the global job manager state between tests."""
    _current_jobs.clear()
    _completed_jobs.clear()


def _patch_publisher(test_case: unittest.TestCase) -> None:
    """Replace JobStatePublisher.publish with a no-op to avoid hanging on IPC."""
    publisher_patch = patch.object(
        JobStatePublisher, "publish", lambda self, payload: None
    )
    publisher_patch.start()
    test_case.addCleanup(publisher_patch.stop)


class TestDebugReplayJob(unittest.TestCase):
    def test_default_fields(self) -> None:
        job = DebugReplayJob()

        self.assertEqual(job.job_type, "debug_replay")
        self.assertEqual(job.status, JobStatusTypesEnum.queued)
        self.assertIsNone(job.current_step)
        self.assertEqual(job.progress_percent, 0.0)

    def test_to_dict_whitelist(self) -> None:
        job = DebugReplayJob(
            source_camera="front",
            replay_camera_name="_replay_front",
            start_ts=100.0,
            end_ts=200.0,
        )
        job.current_step = "preparing_clip"
        job.progress_percent = 42.5

        payload = job.to_dict()

        # Top-level matches the standard Job<TResults> shape.
        for key in (
            "id",
            "job_type",
            "status",
            "start_time",
            "end_time",
            "error_message",
            "results",
        ):
            self.assertIn(key, payload, f"missing top-level field: {key}")

        results = payload["results"]
        self.assertEqual(results["source_camera"], "front")
        self.assertEqual(results["replay_camera_name"], "_replay_front")
        self.assertEqual(results["current_step"], "preparing_clip")
        self.assertEqual(results["progress_percent"], 42.5)
        self.assertEqual(results["start_ts"], 100.0)
        self.assertEqual(results["end_ts"], 200.0)


class TestStartDebugReplayJob(unittest.TestCase):
    def setUp(self) -> None:
        _reset_job_manager()
        _patch_publisher(self)
        self.manager = DebugReplayManager()
        self.frigate_config = MagicMock()
        self.frigate_config.cameras = {"front": MagicMock()}
        self.frigate_config.ffmpeg.ffmpeg_path = "/bin/true"
        self.publisher = MagicMock()

        self.recordings_qs = MagicMock()
        self.recordings_qs.count.return_value = 1
        self.recordings_qs.__iter__.return_value = iter([MagicMock(path="/tmp/r1.mp4")])

    def tearDown(self) -> None:
        runner = get_active_runner()
        if runner is not None:
            runner.cancel()
            runner.join(timeout=2.0)
        _reset_job_manager()

    def test_rejects_unknown_camera(self) -> None:
        with self.assertRaises(ValueError):
            start_debug_replay_job(
                source_camera="missing",
                start_ts=100.0,
                end_ts=200.0,
                frigate_config=self.frigate_config,
                config_publisher=self.publisher,
                replay_manager=self.manager,
            )

    def test_rejects_invalid_time_range(self) -> None:
        with self.assertRaises(ValueError):
            start_debug_replay_job(
                source_camera="front",
                start_ts=200.0,
                end_ts=100.0,
                frigate_config=self.frigate_config,
                config_publisher=self.publisher,
                replay_manager=self.manager,
            )

    def test_rejects_when_no_recordings(self) -> None:
        empty_qs = MagicMock()
        empty_qs.count.return_value = 0
        with patch("frigate.jobs.debug_replay.query_recordings", return_value=empty_qs):
            with self.assertRaises(ValueError):
                start_debug_replay_job(
                    source_camera="front",
                    start_ts=100.0,
                    end_ts=200.0,
                    frigate_config=self.frigate_config,
                    config_publisher=self.publisher,
                    replay_manager=self.manager,
                )

    def test_returns_job_id_and_marks_session_starting(self) -> None:
        block = threading.Event()

        def slow_helper(cmd, **kwargs):
            block.wait(timeout=5)
            return 0, ""

        with (
            patch(
                "frigate.jobs.debug_replay.query_recordings",
                return_value=self.recordings_qs,
            ),
            patch(
                "frigate.jobs.debug_replay.run_ffmpeg_with_progress",
                side_effect=slow_helper,
            ),
            patch.object(self.manager, "publish_camera"),
            patch("os.path.exists", return_value=True),
            patch("os.makedirs"),
            patch("builtins.open", unittest.mock.mock_open()),
        ):
            job_id = start_debug_replay_job(
                source_camera="front",
                start_ts=100.0,
                end_ts=200.0,
                frigate_config=self.frigate_config,
                config_publisher=self.publisher,
                replay_manager=self.manager,
            )

            self.assertIsInstance(job_id, str)
            self.assertTrue(self.manager.active)
            self.assertEqual(self.manager.replay_camera_name, "_replay_front")
            self.assertEqual(self.manager.source_camera, "front")

            block.set()

    def test_rejects_concurrent_calls(self) -> None:
        block = threading.Event()

        def slow_helper(cmd, **kwargs):
            block.wait(timeout=5)
            return 0, ""

        with (
            patch(
                "frigate.jobs.debug_replay.query_recordings",
                return_value=self.recordings_qs,
            ),
            patch(
                "frigate.jobs.debug_replay.run_ffmpeg_with_progress",
                side_effect=slow_helper,
            ),
            patch.object(self.manager, "publish_camera"),
            patch("os.path.exists", return_value=True),
            patch("os.makedirs"),
            patch("builtins.open", unittest.mock.mock_open()),
        ):
            start_debug_replay_job(
                source_camera="front",
                start_ts=100.0,
                end_ts=200.0,
                frigate_config=self.frigate_config,
                config_publisher=self.publisher,
                replay_manager=self.manager,
            )

            with self.assertRaises(RuntimeError):
                start_debug_replay_job(
                    source_camera="front",
                    start_ts=100.0,
                    end_ts=200.0,
                    frigate_config=self.frigate_config,
                    config_publisher=self.publisher,
                    replay_manager=self.manager,
                )

            block.set()


class TestRunnerHappyPath(unittest.TestCase):
    def setUp(self) -> None:
        _reset_job_manager()
        _patch_publisher(self)
        self.manager = DebugReplayManager()
        self.frigate_config = MagicMock()
        self.frigate_config.cameras = {"front": MagicMock()}
        self.frigate_config.ffmpeg.ffmpeg_path = "/bin/true"
        self.publisher = MagicMock()

        self.recordings_qs = MagicMock()
        self.recordings_qs.count.return_value = 1
        self.recordings_qs.__iter__.return_value = iter([MagicMock(path="/tmp/r1.mp4")])

    def tearDown(self) -> None:
        runner = get_active_runner()
        if runner is not None:
            runner.cancel()
            runner.join(timeout=2.0)
        _reset_job_manager()

    def _wait_for(self, predicate, timeout: float = 5.0) -> bool:
        deadline = time.time() + timeout
        while time.time() < deadline:
            if predicate():
                return True
            time.sleep(0.02)
        return False

    def test_progress_callback_updates_job_percent(self) -> None:
        captured: list[float] = []

        def fake_helper(cmd, *, on_progress=None, **kwargs):
            on_progress(0.0)
            on_progress(50.0)
            on_progress(100.0)
            return 0, ""

        with (
            patch(
                "frigate.jobs.debug_replay.query_recordings",
                return_value=self.recordings_qs,
            ),
            patch(
                "frigate.jobs.debug_replay.run_ffmpeg_with_progress",
                side_effect=fake_helper,
            ),
            patch.object(
                self.manager,
                "publish_camera",
                side_effect=lambda *a, **kw: captured.append("published"),
            ),
            patch("os.path.exists", return_value=True),
            patch("os.makedirs"),
            patch("builtins.open", unittest.mock.mock_open()),
        ):
            start_debug_replay_job(
                source_camera="front",
                start_ts=100.0,
                end_ts=200.0,
                frigate_config=self.frigate_config,
                config_publisher=self.publisher,
                replay_manager=self.manager,
            )

            self.assertTrue(
                self._wait_for(lambda: get_active_runner() is None),
                "runner did not finish",
            )

        from frigate.jobs.manager import get_current_job

        job = get_current_job("debug_replay")
        self.assertIsNotNone(job)
        self.assertEqual(job.status, JobStatusTypesEnum.success)
        self.assertEqual(job.progress_percent, 100.0)
        self.assertEqual(captured, ["published"])
        # Manager should have been told the session is ready with the clip path.
        self.assertIsNotNone(self.manager.clip_path)


class TestRunnerFailurePath(unittest.TestCase):
    def setUp(self) -> None:
        _reset_job_manager()
        _patch_publisher(self)
        self.manager = DebugReplayManager()
        self.frigate_config = MagicMock()
        self.frigate_config.cameras = {"front": MagicMock()}
        self.frigate_config.ffmpeg.ffmpeg_path = "/bin/true"
        self.publisher = MagicMock()
        self.recordings_qs = MagicMock()
        self.recordings_qs.count.return_value = 1
        self.recordings_qs.__iter__.return_value = iter([MagicMock(path="/tmp/r1.mp4")])

    def tearDown(self) -> None:
        runner = get_active_runner()
        if runner is not None:
            runner.cancel()
            runner.join(timeout=2.0)
        _reset_job_manager()

    def _wait_for(self, predicate, timeout: float = 5.0) -> bool:
        deadline = time.time() + timeout
        while time.time() < deadline:
            if predicate():
                return True
            time.sleep(0.02)
        return False

    def test_ffmpeg_failure_marks_job_failed_and_clears_session(self) -> None:
        def failing_helper(cmd, **kwargs):
            return 1, "ffmpeg exploded"

        with (
            patch(
                "frigate.jobs.debug_replay.query_recordings",
                return_value=self.recordings_qs,
            ),
            patch(
                "frigate.jobs.debug_replay.run_ffmpeg_with_progress",
                side_effect=failing_helper,
            ),
            patch("os.path.exists", return_value=True),
            patch("os.makedirs"),
            patch("os.remove"),
            patch("builtins.open", unittest.mock.mock_open()),
        ):
            start_debug_replay_job(
                source_camera="front",
                start_ts=100.0,
                end_ts=200.0,
                frigate_config=self.frigate_config,
                config_publisher=self.publisher,
                replay_manager=self.manager,
            )

            self.assertTrue(
                self._wait_for(lambda: get_active_runner() is None),
                "runner did not finish",
            )

        from frigate.jobs.manager import get_current_job

        job = get_current_job("debug_replay")
        self.assertIsNotNone(job)
        self.assertEqual(job.status, JobStatusTypesEnum.failed)
        self.assertIsNotNone(job.error_message)
        self.assertIn("ffmpeg", job.error_message.lower())
        # Session cleared so a new /start is allowed
        self.assertFalse(self.manager.active)


class TestRunnerCancellation(unittest.TestCase):
    def setUp(self) -> None:
        _reset_job_manager()
        _patch_publisher(self)
        self.manager = DebugReplayManager()
        self.frigate_config = MagicMock()
        self.frigate_config.cameras = {"front": MagicMock()}
        self.frigate_config.ffmpeg.ffmpeg_path = "/bin/true"
        self.publisher = MagicMock()
        self.recordings_qs = MagicMock()
        self.recordings_qs.count.return_value = 1
        self.recordings_qs.__iter__.return_value = iter([MagicMock(path="/tmp/r1.mp4")])

    def tearDown(self) -> None:
        runner = get_active_runner()
        if runner is not None:
            runner.cancel()
            runner.join(timeout=2.0)
        _reset_job_manager()

    def _wait_for(self, predicate, timeout: float = 5.0) -> bool:
        deadline = time.time() + timeout
        while time.time() < deadline:
            if predicate():
                return True
            time.sleep(0.02)
        return False

    def test_cancel_terminates_ffmpeg_and_marks_cancelled(self) -> None:
        terminated = threading.Event()
        fake_proc = MagicMock()
        fake_proc.terminate = MagicMock(side_effect=lambda: terminated.set())

        def fake_helper(cmd, *, process_started=None, **kwargs):
            if process_started is not None:
                process_started(fake_proc)
            terminated.wait(timeout=5)
            return -15, "killed"

        with (
            patch(
                "frigate.jobs.debug_replay.query_recordings",
                return_value=self.recordings_qs,
            ),
            patch(
                "frigate.jobs.debug_replay.run_ffmpeg_with_progress",
                side_effect=fake_helper,
            ),
            patch("os.path.exists", return_value=True),
            patch("os.makedirs"),
            patch("os.remove"),
            patch("builtins.open", unittest.mock.mock_open()),
        ):
            start_debug_replay_job(
                source_camera="front",
                start_ts=100.0,
                end_ts=200.0,
                frigate_config=self.frigate_config,
                config_publisher=self.publisher,
                replay_manager=self.manager,
            )

            # Wait for the runner to register the active process.
            self.assertTrue(
                self._wait_for(
                    lambda: (
                        get_active_runner() is not None
                        and get_active_runner()._active_process is fake_proc
                    )
                )
            )

            cancelled = cancel_debug_replay_job()
            self.assertTrue(cancelled)
            self.assertTrue(fake_proc.terminate.called)

            self.assertTrue(
                self._wait_for(lambda: get_active_runner() is None),
                "runner did not finish",
            )

        from frigate.jobs.manager import get_current_job

        job = get_current_job("debug_replay")
        self.assertEqual(job.status, JobStatusTypesEnum.cancelled)


if __name__ == "__main__":
    unittest.main()
