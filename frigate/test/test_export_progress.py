"""Tests for export progress tracking, broadcast, and FFmpeg parsing."""

import io
import unittest
from unittest.mock import MagicMock, patch

from frigate.jobs.export import (
    PROGRESS_BROADCAST_MIN_INTERVAL,
    ExportJob,
    ExportJobManager,
)
from frigate.record.export import PlaybackSourceEnum, RecordingExporter
from frigate.types import JobStatusTypesEnum


def _make_exporter(
    end_minus_start: int = 100,
    ffmpeg_input_args=None,
    ffmpeg_output_args=None,
    on_progress=None,
) -> RecordingExporter:
    """Build a RecordingExporter without invoking its real __init__ side
    effects (which create directories and require a full FrigateConfig)."""
    exporter = RecordingExporter.__new__(RecordingExporter)
    exporter.config = MagicMock()
    exporter.export_id = "test_export"
    exporter.camera = "front"
    exporter.user_provided_name = None
    exporter.user_provided_image = None
    exporter.start_time = 1_000
    exporter.end_time = 1_000 + end_minus_start
    exporter.playback_source = PlaybackSourceEnum.recordings
    exporter.export_case_id = None
    exporter.ffmpeg_input_args = ffmpeg_input_args
    exporter.ffmpeg_output_args = ffmpeg_output_args
    exporter.cpu_fallback = False
    exporter.on_progress = on_progress
    return exporter


class TestExportJobToDict(unittest.TestCase):
    def test_to_dict_includes_progress_fields(self) -> None:
        job = ExportJob(camera="front", request_start_time=0, request_end_time=10)
        result = job.to_dict()

        assert "current_step" in result
        assert "progress_percent" in result
        assert result["current_step"] == "queued"
        assert result["progress_percent"] == 0.0

    def test_to_dict_reflects_updated_progress(self) -> None:
        job = ExportJob(camera="front", request_start_time=0, request_end_time=10)
        job.current_step = "encoding"
        job.progress_percent = 42.5

        result = job.to_dict()

        assert result["current_step"] == "encoding"
        assert result["progress_percent"] == 42.5


class TestExpectedOutputDuration(unittest.TestCase):
    def test_normal_export_uses_input_duration(self) -> None:
        exporter = _make_exporter(end_minus_start=600)
        assert exporter._expected_output_duration_seconds() == 600.0

    def test_timelapse_uses_setpts_factor(self) -> None:
        exporter = _make_exporter(
            end_minus_start=1000,
            ffmpeg_input_args="-y",
            ffmpeg_output_args="-vf setpts=0.04*PTS -r 30",
        )
        # 1000s input * 0.04 = 40s of output
        assert exporter._expected_output_duration_seconds() == 40.0

    def test_unknown_factor_falls_back_to_input_duration(self) -> None:
        exporter = _make_exporter(
            end_minus_start=300,
            ffmpeg_input_args="-y",
            ffmpeg_output_args="-c:v libx264 -preset veryfast",
        )
        assert exporter._expected_output_duration_seconds() == 300.0

    def test_zero_factor_falls_back_to_input_duration(self) -> None:
        exporter = _make_exporter(
            end_minus_start=300,
            ffmpeg_input_args="-y",
            ffmpeg_output_args="-vf setpts=0*PTS",
        )
        assert exporter._expected_output_duration_seconds() == 300.0

    def test_uses_actual_recorded_seconds_when_available(self) -> None:
        """If the DB shows only 120s of saved recordings inside a 1h
        requested range, progress should be computed against 120s."""
        exporter = _make_exporter(end_minus_start=3600)
        exporter._sum_source_duration_seconds = lambda: 120.0  # type: ignore[method-assign]
        assert exporter._expected_output_duration_seconds() == 120.0

    def test_actual_recorded_seconds_scaled_by_setpts(self) -> None:
        """Recorded duration must still be scaled by the timelapse factor."""
        exporter = _make_exporter(
            end_minus_start=3600,
            ffmpeg_input_args="-y",
            ffmpeg_output_args="-vf setpts=0.04*PTS -r 30",
        )
        exporter._sum_source_duration_seconds = lambda: 600.0  # type: ignore[method-assign]
        # 600s * 0.04 = 24s of output
        assert exporter._expected_output_duration_seconds() == 24.0

    def test_db_failure_falls_back_to_requested_range(self) -> None:
        exporter = _make_exporter(end_minus_start=300)
        exporter._sum_source_duration_seconds = lambda: None  # type: ignore[method-assign]
        assert exporter._expected_output_duration_seconds() == 300.0


class TestProgressFlagInjection(unittest.TestCase):
    def test_inserts_before_output_path(self) -> None:
        exporter = _make_exporter()
        cmd = ["ffmpeg", "-i", "input.m3u8", "-c", "copy", "/tmp/output.mp4"]

        result = exporter._inject_progress_flags(cmd)

        assert result == [
            "ffmpeg",
            "-i",
            "input.m3u8",
            "-c",
            "copy",
            "-progress",
            "pipe:2",
            "-nostats",
            "/tmp/output.mp4",
        ]

    def test_handles_empty_cmd(self) -> None:
        exporter = _make_exporter()
        assert exporter._inject_progress_flags([]) == []


class TestFfmpegProgressParsing(unittest.TestCase):
    """Verify percentage calculation from FFmpeg ``-progress`` output."""

    def _run_with_stderr(
        self,
        stderr_text: str,
        expected_duration_seconds: int = 90,
    ) -> list[tuple[str, float]]:
        """Helper: run _run_ffmpeg_with_progress against a mocked Popen
        whose stderr emits the supplied text. Returns the list of
        (step, percent) tuples that the on_progress callback received."""
        captured: list[tuple[str, float]] = []

        def on_progress(step: str, percent: float) -> None:
            captured.append((step, percent))

        exporter = _make_exporter(
            end_minus_start=expected_duration_seconds,
            on_progress=on_progress,
        )

        fake_proc = MagicMock()
        fake_proc.stdin = io.StringIO()
        fake_proc.stderr = io.StringIO(stderr_text)
        fake_proc.returncode = 0
        fake_proc.wait = MagicMock(return_value=0)

        with patch("frigate.record.export.sp.Popen", return_value=fake_proc):
            returncode, _stderr = exporter._run_ffmpeg_with_progress(
                ["ffmpeg", "-i", "x.m3u8", "/tmp/out.mp4"], "playlist", step="encoding"
            )

        assert returncode == 0
        return captured

    def test_parses_out_time_us_into_percent(self) -> None:
        # 90s duration; 45s out_time => 50%
        stderr = "out_time_us=45000000\nprogress=continue\n"
        captured = self._run_with_stderr(stderr, expected_duration_seconds=90)

        # The first call is the synchronous 0.0 emit before Popen runs.
        assert captured[0] == ("encoding", 0.0)
        assert any(percent == 50.0 for step, percent in captured if step == "encoding")

    def test_progress_end_emits_100_percent(self) -> None:
        stderr = "out_time_us=10000000\nprogress=end\n"
        captured = self._run_with_stderr(stderr, expected_duration_seconds=90)

        assert captured[-1] == ("encoding", 100.0)

    def test_clamps_overshoot_at_100(self) -> None:
        # 150s of output reported against 90s expected duration.
        stderr = "out_time_us=150000000\nprogress=continue\n"
        captured = self._run_with_stderr(stderr, expected_duration_seconds=90)

        encoding_values = [p for s, p in captured if s == "encoding" and p > 0]
        assert all(p <= 100.0 for p in encoding_values)
        assert encoding_values[-1] == 100.0

    def test_ignores_garbage_lines(self) -> None:
        stderr = (
            "frame=  120 fps= 30 q=23.0 size=    512kB\n"
            "out_time_us=not-a-number\n"
            "out_time_us=30000000\n"
            "progress=continue\n"
        )
        captured = self._run_with_stderr(stderr, expected_duration_seconds=90)

        # We expect 0.0 (from initial emit) plus the 30s/90s = 33.33...% step
        encoding_percents = sorted({round(p, 2) for s, p in captured})
        assert 0.0 in encoding_percents
        assert any(abs(p - (30 / 90 * 100)) < 0.01 for p in encoding_percents)


class TestBroadcastAggregation(unittest.TestCase):
    """Verify ExportJobManager broadcast payload shape and throttling."""

    def _make_manager(self) -> tuple[ExportJobManager, MagicMock]:
        """Build a manager with an injected mock publisher. Returns
        ``(manager, publisher)`` so tests can assert on broadcast payloads
        without touching ZMQ at all."""
        config = MagicMock()
        publisher = MagicMock()
        manager = ExportJobManager(
            config, max_concurrent=2, max_queued=10, publisher=publisher
        )
        return manager, publisher

    @staticmethod
    def _last_payload(publisher: MagicMock) -> dict:
        return publisher.publish.call_args.args[0]

    def test_empty_jobs_broadcasts_empty_list(self) -> None:
        manager, publisher = self._make_manager()
        manager._broadcast_all_jobs(force=True)

        publisher.publish.assert_called_once()
        payload = self._last_payload(publisher)
        assert payload["job_type"] == "export"
        assert payload["status"] == "queued"
        assert payload["results"]["jobs"] == []

    def test_single_running_job_payload(self) -> None:
        manager, publisher = self._make_manager()
        job = ExportJob(camera="front", request_start_time=0, request_end_time=10)
        job.status = JobStatusTypesEnum.running
        job.current_step = "encoding"
        job.progress_percent = 75.0
        manager.jobs[job.id] = job

        manager._broadcast_all_jobs(force=True)

        payload = self._last_payload(publisher)
        assert payload["status"] == "running"
        assert len(payload["results"]["jobs"]) == 1
        broadcast_job = payload["results"]["jobs"][0]
        assert broadcast_job["current_step"] == "encoding"
        assert broadcast_job["progress_percent"] == 75.0

    def test_multiple_jobs_broadcast(self) -> None:
        manager, publisher = self._make_manager()
        for i, status in enumerate(
            (JobStatusTypesEnum.queued, JobStatusTypesEnum.running)
        ):
            job = ExportJob(
                id=f"job_{i}",
                camera="front",
                request_start_time=0,
                request_end_time=10,
            )
            job.status = status
            manager.jobs[job.id] = job

        manager._broadcast_all_jobs(force=True)

        payload = self._last_payload(publisher)
        assert payload["status"] == "running"
        assert len(payload["results"]["jobs"]) == 2

    def test_completed_jobs_are_excluded(self) -> None:
        manager, publisher = self._make_manager()
        active = ExportJob(id="active", camera="front")
        active.status = JobStatusTypesEnum.running
        finished = ExportJob(id="done", camera="front")
        finished.status = JobStatusTypesEnum.success
        manager.jobs[active.id] = active
        manager.jobs[finished.id] = finished

        manager._broadcast_all_jobs(force=True)

        payload = self._last_payload(publisher)
        ids = [j["id"] for j in payload["results"]["jobs"]]
        assert ids == ["active"]

    def test_throttle_skips_rapid_unforced_broadcasts(self) -> None:
        manager, publisher = self._make_manager()
        job = ExportJob(camera="front")
        job.status = JobStatusTypesEnum.running
        manager.jobs[job.id] = job

        manager._broadcast_all_jobs(force=True)
        # Immediately following non-forced broadcasts should be skipped.
        for _ in range(5):
            manager._broadcast_all_jobs(force=False)

        assert publisher.publish.call_count == 1

    def test_throttle_allows_broadcast_after_interval(self) -> None:
        manager, publisher = self._make_manager()
        job = ExportJob(camera="front")
        job.status = JobStatusTypesEnum.running
        manager.jobs[job.id] = job

        with patch("frigate.jobs.export.time.monotonic") as mock_mono:
            mock_mono.return_value = 100.0
            manager._broadcast_all_jobs(force=True)

            mock_mono.return_value = 100.0 + PROGRESS_BROADCAST_MIN_INTERVAL + 0.01
            manager._broadcast_all_jobs(force=False)

        assert publisher.publish.call_count == 2

    def test_force_bypasses_throttle(self) -> None:
        manager, publisher = self._make_manager()
        job = ExportJob(camera="front")
        job.status = JobStatusTypesEnum.running
        manager.jobs[job.id] = job

        manager._broadcast_all_jobs(force=True)
        manager._broadcast_all_jobs(force=True)

        assert publisher.publish.call_count == 2

    def test_publisher_exceptions_do_not_propagate(self) -> None:
        """A failing publisher must not break the manager: broadcasts are
        best-effort since the dispatcher may not be available (tests,
        startup races)."""
        manager, publisher = self._make_manager()
        publisher.publish.side_effect = RuntimeError("comms down")

        job = ExportJob(camera="front")
        job.status = JobStatusTypesEnum.running
        manager.jobs[job.id] = job

        # Swallow our own RuntimeError if the manager doesn't; the real
        # JobStatePublisher handles its own exceptions internally, so the
        # manager can stay naive. But if something bubbles up it should
        # not escape _broadcast_all_jobs — enforce that contract here.
        try:
            manager._broadcast_all_jobs(force=True)
        except RuntimeError:
            self.fail("_broadcast_all_jobs must tolerate publisher failures")

    def test_progress_callback_updates_job_and_broadcasts(self) -> None:
        manager, _publisher = self._make_manager()
        job = ExportJob(camera="front")
        job.status = JobStatusTypesEnum.running
        manager.jobs[job.id] = job

        callback = manager._make_progress_callback(job)
        callback("encoding", 33.0)

        assert job.current_step == "encoding"
        assert job.progress_percent == 33.0


class TestGetDatetimeFromTimestamp(unittest.TestCase):
    """Auto-generated export name should honor config.ui.timezone, not
    fall back to the container's UTC clock when a timezone is configured.
    """

    def test_uses_configured_ui_timezone(self) -> None:
        exporter = _make_exporter()
        exporter.config.ui.timezone = "America/New_York"
        # 2025-01-15 12:00:00 UTC is 07:00:00 EST
        assert exporter.get_datetime_from_timestamp(1736942400) == "2025-01-15 07:00:00"

    def test_falls_back_to_local_when_timezone_unset(self) -> None:
        exporter = _make_exporter()
        exporter.config.ui.timezone = None
        # No assertion on the exact wall-clock value — just confirm no
        # exception and that pytz isn't required when the field is unset.
        assert isinstance(exporter.get_datetime_from_timestamp(1736942400), str)

    def test_invalid_timezone_falls_back_to_local(self) -> None:
        exporter = _make_exporter()
        exporter.config.ui.timezone = "Not/A_Real_Zone"
        assert isinstance(exporter.get_datetime_from_timestamp(1736942400), str)


class TestSchedulesCleanup(unittest.TestCase):
    def test_schedule_job_cleanup_removes_after_delay(self) -> None:
        config = MagicMock()
        manager = ExportJobManager(config, max_concurrent=1, max_queued=1)
        job = ExportJob(id="cleanup_me", camera="front")
        manager.jobs[job.id] = job

        with patch("frigate.jobs.export.threading.Timer") as mock_timer:
            manager._schedule_job_cleanup(job.id)
            mock_timer.assert_called_once()
            delay, fn = mock_timer.call_args.args
            assert delay > 0

            # Invoke the callback directly to confirm it removes the job.
            fn()
            assert job.id not in manager.jobs


if __name__ == "__main__":
    unittest.main()
