"""Debug replay startup job: ffmpeg concat + camera config publish.

The runner orchestrates the async portion of starting a debug replay
session. The DebugReplayManager (in frigate.debug_replay) owns session
presence so the status bar can keep reading a single `active` flag from
/debug_replay/status for the entire session window — which is broader
than this job's lifetime.
"""

import logging
import os
import subprocess as sp
import threading
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Optional

from peewee import ModelSelect

from frigate.config import FrigateConfig
from frigate.config.camera.updater import CameraConfigUpdatePublisher
from frigate.const import REPLAY_CAMERA_PREFIX, REPLAY_DIR
from frigate.jobs.export import JobStatePublisher
from frigate.jobs.job import Job
from frigate.jobs.manager import job_is_running, set_current_job
from frigate.models import Recordings
from frigate.types import JobStatusTypesEnum
from frigate.util.ffmpeg import run_ffmpeg_with_progress

if TYPE_CHECKING:
    from frigate.debug_replay import DebugReplayManager

logger = logging.getLogger(__name__)

# Coalesce frequent ffmpeg progress callbacks so the WS isn't flooded.
PROGRESS_BROADCAST_MIN_INTERVAL = 1.0

JOB_TYPE = "debug_replay"

STEP_PREPARING_CLIP = "preparing_clip"
STEP_STARTING_CAMERA = "starting_camera"


_active_runner: Optional["DebugReplayJobRunner"] = None
_runner_lock = threading.Lock()


def _set_active_runner(runner: Optional["DebugReplayJobRunner"]) -> None:
    global _active_runner
    with _runner_lock:
        _active_runner = runner


def get_active_runner() -> Optional["DebugReplayJobRunner"]:
    with _runner_lock:
        return _active_runner


@dataclass
class DebugReplayJob(Job):
    """Job state for a debug replay startup."""

    job_type: str = JOB_TYPE
    source_camera: str = ""
    replay_camera_name: str = ""
    start_ts: float = 0.0
    end_ts: float = 0.0
    current_step: Optional[str] = None
    progress_percent: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        """Whitelisted payload for the job_state WS topic.

        Replay-specific fields land in results so the frontend's
        generic Job<TResults> type can be parameterised cleanly.
        """
        return {
            "id": self.id,
            "job_type": self.job_type,
            "status": self.status,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "error_message": self.error_message,
            "results": {
                "current_step": self.current_step,
                "progress_percent": self.progress_percent,
                "source_camera": self.source_camera,
                "replay_camera_name": self.replay_camera_name,
                "start_ts": self.start_ts,
                "end_ts": self.end_ts,
            },
        }


def query_recordings(
    source_camera: str, start_ts: float, end_ts: float
) -> ModelSelect:
    """Return the Recordings query for the time range.

    Module-level so tests can patch it without instantiating a runner.
    """
    return (
        Recordings.select(
            Recordings.path,
            Recordings.start_time,
            Recordings.end_time,
        )
        .where(
            Recordings.start_time.between(start_ts, end_ts)
            | Recordings.end_time.between(start_ts, end_ts)
            | ((start_ts > Recordings.start_time) & (end_ts < Recordings.end_time))
        )
        .where(Recordings.camera == source_camera)
        .order_by(Recordings.start_time.asc())
    )


class DebugReplayJobRunner(threading.Thread):
    """Worker thread that drives the startup job to completion.

    Owns the live ffmpeg Popen reference for cancellation. Cancellation
    is two-step (threading.Event + proc.terminate()) so the runner
    both knows it should stop and is unblocked from its blocking subprocess
    wait.
    """

    def __init__(
        self,
        job: DebugReplayJob,
        frigate_config: FrigateConfig,
        config_publisher: CameraConfigUpdatePublisher,
        replay_manager: "DebugReplayManager",
        publisher: Optional[JobStatePublisher] = None,
    ) -> None:
        super().__init__(daemon=True, name=f"debug_replay_{job.id}")
        self.job = job
        self.frigate_config = frigate_config
        self.config_publisher = config_publisher
        self.replay_manager = replay_manager
        self.publisher = publisher if publisher is not None else JobStatePublisher()
        self._cancel_event = threading.Event()
        self._active_process: sp.Popen | None = None
        self._proc_lock = threading.Lock()
        self._last_broadcast_monotonic: float = 0.0

    def cancel(self) -> None:
        """Request cancellation. Idempotent."""
        self._cancel_event.set()
        with self._proc_lock:
            proc = self._active_process
        if proc is not None:
            try:
                proc.terminate()
            except Exception as exc:
                logger.warning("Failed to terminate ffmpeg subprocess: %s", exc)

    def is_cancelled(self) -> bool:
        return self._cancel_event.is_set()

    def _record_proc(self, proc: sp.Popen) -> None:
        with self._proc_lock:
            self._active_process = proc
        # Race: cancel arrived between Popen and _record_proc.
        if self._cancel_event.is_set():
            try:
                proc.terminate()
            except Exception:
                pass

    def _broadcast(self, force: bool = False) -> None:
        now = time.monotonic()
        if (
            not force
            and now - self._last_broadcast_monotonic < PROGRESS_BROADCAST_MIN_INTERVAL
        ):
            return
        self._last_broadcast_monotonic = now

        try:
            self.publisher.publish(self.job.to_dict())
        except Exception as err:
            logger.warning("Publisher raised during job state broadcast: %s", err)

    def run(self) -> None:
        replay_name = self.job.replay_camera_name
        os.makedirs(REPLAY_DIR, exist_ok=True)
        concat_file = os.path.join(REPLAY_DIR, f"{replay_name}_concat.txt")
        clip_path = os.path.join(REPLAY_DIR, f"{replay_name}.mp4")

        self.job.status = JobStatusTypesEnum.running
        self.job.start_time = time.time()
        self.job.current_step = STEP_PREPARING_CLIP
        self._broadcast(force=True)

        try:
            recordings = query_recordings(
                self.job.source_camera, self.job.start_ts, self.job.end_ts
            )
            with open(concat_file, "w") as f:
                for recording in recordings:
                    f.write(f"file '{recording.path}'\n")

            ffmpeg_cmd = [
                self.frigate_config.ffmpeg.ffmpeg_path,
                "-hide_banner",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                concat_file,
                "-c",
                "copy",
                "-movflags",
                "+faststart",
                clip_path,
            ]

            logger.info(
                "Generating replay clip for %s (%.1f - %.1f)",
                self.job.source_camera,
                self.job.start_ts,
                self.job.end_ts,
            )

            def _on_progress(percent: float) -> None:
                self.job.progress_percent = percent
                self._broadcast()

            try:
                returncode, stderr = run_ffmpeg_with_progress(
                    ffmpeg_cmd,
                    expected_duration_seconds=max(
                        0.0, self.job.end_ts - self.job.start_ts
                    ),
                    on_progress=_on_progress,
                    process_started=self._record_proc,
                    use_low_priority=True,
                )
            finally:
                with self._proc_lock:
                    self._active_process = None

            if self._cancel_event.is_set():
                self._finalize_cancelled(clip_path)
                return

            if returncode != 0:
                raise RuntimeError(f"FFmpeg failed: {stderr[-500:]}")

            if not os.path.exists(clip_path):
                raise RuntimeError("Clip file was not created")

            self.job.current_step = STEP_STARTING_CAMERA
            self.job.progress_percent = 100.0
            self._broadcast(force=True)

            if self._cancel_event.is_set():
                self._finalize_cancelled(clip_path)
                return

            self.replay_manager.publish_camera(
                source_camera=self.job.source_camera,
                replay_name=replay_name,
                clip_path=clip_path,
                frigate_config=self.frigate_config,
                config_publisher=self.config_publisher,
            )
            self.replay_manager.mark_session_ready(clip_path)

            self.job.status = JobStatusTypesEnum.success
            self.job.end_time = time.time()
            self._broadcast(force=True)
            logger.info(
                "Debug replay started: %s -> %s",
                self.job.source_camera,
                replay_name,
            )
        except Exception as exc:
            logger.exception("Debug replay startup failed")
            self.job.status = JobStatusTypesEnum.failed
            self.job.error_message = str(exc)
            self.job.end_time = time.time()
            self._broadcast(force=True)
            self.replay_manager.clear_session()
            _remove_silent(clip_path)
        finally:
            _remove_silent(concat_file)
            _set_active_runner(None)

    def _finalize_cancelled(self, clip_path: str) -> None:
        logger.info("Debug replay startup cancelled")
        self.job.status = JobStatusTypesEnum.cancelled
        self.job.end_time = time.time()
        self._broadcast(force=True)
        # The caller of cancel_debug_replay_job (DebugReplayManager.stop) owns
        # session cleanup — db rows, filesystem artifacts, clear_session. We
        # only clean up the partial concat output we created.
        _remove_silent(clip_path)


def _remove_silent(path: str) -> None:
    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:
        pass


def start_debug_replay_job(
    *,
    source_camera: str,
    start_ts: float,
    end_ts: float,
    frigate_config: FrigateConfig,
    config_publisher: CameraConfigUpdatePublisher,
    replay_manager: "DebugReplayManager",
) -> str:
    """Validate, create job, start runner. Returns the job id.

    Raises ValueError for bad params (camera missing, time range
    invalid, no recordings) and RuntimeError if a session is already
    active.
    """
    if job_is_running(JOB_TYPE) or replay_manager.active:
        raise RuntimeError("A replay session is already active")

    if source_camera not in frigate_config.cameras:
        raise ValueError(f"Camera '{source_camera}' not found")

    if end_ts <= start_ts:
        raise ValueError("End time must be after start time")

    recordings = query_recordings(source_camera, start_ts, end_ts)
    if not recordings.count():
        raise ValueError(
            f"No recordings found for camera '{source_camera}' in the specified time range"
        )

    replay_name = f"{REPLAY_CAMERA_PREFIX}{source_camera}"
    replay_manager.mark_starting(
        source_camera=source_camera,
        replay_camera_name=replay_name,
        start_ts=start_ts,
        end_ts=end_ts,
    )

    job = DebugReplayJob(
        source_camera=source_camera,
        replay_camera_name=replay_name,
        start_ts=start_ts,
        end_ts=end_ts,
    )
    set_current_job(job)

    runner = DebugReplayJobRunner(
        job=job,
        frigate_config=frigate_config,
        config_publisher=config_publisher,
        replay_manager=replay_manager,
    )
    _set_active_runner(runner)
    runner.start()

    return job.id


def cancel_debug_replay_job() -> bool:
    """Signal the active runner to cancel.

    Returns True if a runner was signalled, False if no job was active.
    """
    runner = get_active_runner()
    if runner is None:
        return False
    runner.cancel()
    return True


def wait_for_runner(timeout: float = 2.0) -> bool:
    """Join the active runner. Returns True if the runner ended in time."""
    runner = get_active_runner()
    if runner is None:
        return True
    runner.join(timeout=timeout)
    return not runner.is_alive()
