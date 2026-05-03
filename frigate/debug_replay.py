"""Debug replay camera management for replaying recordings with detection overlays."""

import logging
import os
import shutil
import subprocess as sp
import threading
from enum import Enum

from ruamel.yaml import YAML

from frigate.config import FrigateConfig
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdatePublisher,
    CameraConfigUpdateTopic,
)
from frigate.const import (
    CLIPS_DIR,
    RECORD_DIR,
    REPLAY_CAMERA_PREFIX,
    REPLAY_DIR,
    THUMB_DIR,
)
from frigate.models import Recordings
from frigate.util.camera_cleanup import cleanup_camera_db, cleanup_camera_files
from frigate.util.config import find_config_file
from frigate.util.ffmpeg import run_ffmpeg_with_progress

logger = logging.getLogger(__name__)


class ReplayState(str, Enum):
    """State of the debug replay session lifecycle.

    idle:             no session
    preparing_clip:   ffmpeg concat is running, no replay camera yet
    starting_camera:  clip ready, publishing camera config update
    active:           replay camera is published; first frame may not have arrived yet
    error:            startup failed; error_message is set
    """

    idle = "idle"
    preparing_clip = "preparing_clip"
    starting_camera = "starting_camera"
    active = "active"
    error = "error"


class DebugReplayManager:
    """Manages a single debug replay session."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._state: ReplayState = ReplayState.idle
        self.error_message: str | None = None
        self.replay_camera_name: str | None = None
        self.source_camera: str | None = None
        self.clip_path: str | None = None
        self.start_ts: float | None = None
        self.end_ts: float | None = None
        self._active_process: sp.Popen | None = None
        self._worker_thread: threading.Thread | None = None
        self.progress_percent: float | None = None

    @property
    def state(self) -> ReplayState:
        return self._state

    @property
    def active(self) -> bool:
        """Whether a replay session is in progress (preparing, starting, or active)."""
        return self._state in (
            ReplayState.preparing_clip,
            ReplayState.starting_camera,
            ReplayState.active,
        )

    def _set_state(
        self, state: ReplayState, error_message: str | None = None
    ) -> None:
        """Internal state transition helper. Always pair `error` with an error_message."""
        self._state = state
        self.error_message = error_message if state == ReplayState.error else None
        if state in (ReplayState.idle, ReplayState.error):
            self.progress_percent = None

    def start(
        self,
        source_camera: str,
        start_ts: float,
        end_ts: float,
        frigate_config: FrigateConfig,
        config_publisher: CameraConfigUpdatePublisher,
    ) -> str:
        """Validate inputs and kick off async startup. Returns immediately.

        The clip generation, config build, and camera publish run on a worker
        thread. Poll `state` / `error_message` to track progress.

        Args:
            source_camera: Name of the source camera to replay
            start_ts: Start timestamp
            end_ts: End timestamp
            frigate_config: Current Frigate configuration
            config_publisher: Publisher for camera config updates

        Returns:
            The replay camera name (deterministic from source_camera)

        Raises:
            ValueError: If a session is already active or parameters are invalid
        """
        with self._lock:
            if self.active:
                raise ValueError("A replay session is already active")

            if source_camera not in frigate_config.cameras:
                raise ValueError(f"Camera '{source_camera}' not found")

            if end_ts <= start_ts:
                raise ValueError("End time must be after start time")

            recordings = self._query_recordings(source_camera, start_ts, end_ts)
            if not recordings.count():
                raise ValueError(
                    f"No recordings found for camera '{source_camera}' in the specified time range"
                )

            replay_name = f"{REPLAY_CAMERA_PREFIX}{source_camera}"
            self.replay_camera_name = replay_name
            self.source_camera = source_camera
            self.start_ts = start_ts
            self.end_ts = end_ts
            self.progress_percent = None
            self._set_state(ReplayState.preparing_clip)

        worker = threading.Thread(
            target=self._run_start_worker,
            name=f"debug-replay-start-{replay_name}",
            args=(source_camera, start_ts, end_ts, frigate_config, config_publisher),
            daemon=True,
        )
        self._worker_thread = worker
        worker.start()

        return replay_name

    def _query_recordings(self, source_camera: str, start_ts: float, end_ts: float):
        """Return the Recordings query for the time range. Extracted so tests can patch.

        Args:
            source_camera: Name of the source camera
            start_ts: Start timestamp
            end_ts: End timestamp

        Returns:
            Peewee query for recordings in the time range
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

    def _run_start_worker(
        self,
        source_camera: str,
        start_ts: float,
        end_ts: float,
        frigate_config: FrigateConfig,
        config_publisher: CameraConfigUpdatePublisher,
    ) -> None:
        """Worker thread body — runs ffmpeg and publishes the camera config.

        Args:
            source_camera: Name of the source camera to replay
            start_ts: Start timestamp
            end_ts: End timestamp
            frigate_config: Current Frigate configuration
            config_publisher: Publisher for camera config updates
        """
        replay_name = self.replay_camera_name
        if replay_name is None:
            return

        os.makedirs(REPLAY_DIR, exist_ok=True)
        concat_file = os.path.join(REPLAY_DIR, f"{replay_name}_concat.txt")
        clip_path = os.path.join(REPLAY_DIR, f"{replay_name}.mp4")

        try:
            recordings = self._query_recordings(source_camera, start_ts, end_ts)
            with open(concat_file, "w") as f:
                for recording in recordings:
                    f.write(f"file '{recording.path}'\n")

            ffmpeg_cmd = [
                frigate_config.ffmpeg.ffmpeg_path,
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
                source_camera,
                start_ts,
                end_ts,
            )

            def _record_proc(p: sp.Popen) -> None:
                self._active_process = p

            def _on_progress(percent: float) -> None:
                self.progress_percent = percent

            try:
                returncode, stderr = run_ffmpeg_with_progress(
                    ffmpeg_cmd,
                    expected_duration_seconds=max(0.0, end_ts - start_ts),
                    on_progress=_on_progress,
                    process_started=_record_proc,
                    use_low_priority=True,
                )
            finally:
                self._active_process = None

            if returncode != 0:
                raise RuntimeError(f"FFmpeg failed: {stderr[-500:]}")

            if not os.path.exists(clip_path):
                raise RuntimeError("Clip file was not created")

            with self._lock:
                # If stop() ran while we were preparing, bail out cleanly.
                if self._state != ReplayState.preparing_clip:
                    logger.info(
                        "Replay startup aborted (state=%s); discarding clip",
                        self._state,
                    )
                    return
                self._set_state(ReplayState.starting_camera)

            self._publish_replay_camera(
                source_camera, replay_name, clip_path, frigate_config, config_publisher
            )

            with self._lock:
                self.clip_path = clip_path
                self._set_state(ReplayState.active)

            logger.info("Debug replay started: %s -> %s", source_camera, replay_name)
        except Exception as exc:
            logger.exception("Debug replay startup failed")
            with self._lock:
                # If stop() already ran while we were preparing, don't overwrite idle state.
                if self._state == ReplayState.idle:
                    return
                self._set_state(ReplayState.error, error_message=str(exc))
                # Drop session pointers so the next /start is allowed.
                self.replay_camera_name = None
                self.source_camera = None
                self.clip_path = None
                self.start_ts = None
                self.end_ts = None
            # Best-effort cleanup of any partial clip on disk.
            try:
                if os.path.exists(clip_path):
                    os.remove(clip_path)
            except OSError:
                pass
        finally:
            try:
                if os.path.exists(concat_file):
                    os.remove(concat_file)
            except OSError:
                pass

    def _publish_replay_camera(
        self,
        source_camera: str,
        replay_name: str,
        clip_path: str,
        frigate_config: FrigateConfig,
        config_publisher: CameraConfigUpdatePublisher,
    ) -> None:
        """Build the in-memory camera config and publish the add event.

        Args:
            source_camera: Name of the source camera
            replay_name: Name for the replay camera
            clip_path: Path to the replay clip file
            frigate_config: Current Frigate configuration
            config_publisher: Publisher for camera config updates
        """
        source_config = frigate_config.cameras[source_camera]
        camera_dict = self._build_camera_config_dict(
            source_config, replay_name, clip_path
        )

        config_file = find_config_file()
        yaml_parser = YAML()
        with open(config_file, "r") as f:
            config_data = yaml_parser.load(f)

        if "cameras" not in config_data or config_data["cameras"] is None:
            config_data["cameras"] = {}
        config_data["cameras"][replay_name] = camera_dict

        new_config = FrigateConfig.parse_object(config_data)
        frigate_config.cameras[replay_name] = new_config.cameras[replay_name]

        config_publisher.publish_update(
            CameraConfigUpdateTopic(CameraConfigUpdateEnum.add, replay_name),
            new_config.cameras[replay_name],
        )

    def stop(
        self,
        frigate_config: FrigateConfig,
        config_publisher: CameraConfigUpdatePublisher,
    ) -> None:
        """Stop the active replay session and clean up all artifacts.

        Args:
            frigate_config: Current Frigate configuration
            config_publisher: Publisher for camera config updates
        """
        with self._lock:
            self._stop_locked(frigate_config, config_publisher)

    def _stop_locked(
        self,
        frigate_config: FrigateConfig,
        config_publisher: CameraConfigUpdatePublisher,
    ) -> None:
        if not self.active:
            logger.warning("No active replay session to stop")
            return

        replay_name = self.replay_camera_name
        was_preparing = self._state == ReplayState.preparing_clip

        if was_preparing and self._active_process is not None:
            logger.info("Cancelling in-flight replay clip generation")
            try:
                self._active_process.terminate()
            except Exception as exc:
                logger.warning("Failed to terminate ffmpeg subprocess: %s", exc)

        # Keep a reference so we can join the worker after we've finished cleanup.
        worker = self._worker_thread

        # Only publish the remove event if the camera was actually published.
        if (
            not was_preparing
            and replay_name is not None
            and replay_name in frigate_config.cameras
        ):
            config_publisher.publish_update(
                CameraConfigUpdateTopic(CameraConfigUpdateEnum.remove, replay_name),
                frigate_config.cameras[replay_name],
            )

        if replay_name is not None:
            self._cleanup_db(replay_name)
            self._cleanup_files(replay_name)

        self.replay_camera_name = None
        self.source_camera = None
        self.clip_path = None
        self.start_ts = None
        self.end_ts = None
        self._set_state(ReplayState.idle)

        logger.info("Debug replay stopped and cleaned up: %s", replay_name)

        # Bounded worker join so the API never hangs.
        if worker is not None and worker.is_alive():
            worker.join(timeout=2.0)

    def _build_camera_config_dict(
        self,
        source_config,
        replay_name: str,
        clip_path: str,
    ) -> dict:
        """Build a camera config dictionary for the replay camera.

        Args:
            source_config: Source camera's CameraConfig
            replay_name: Name for the replay camera
            clip_path: Path to the replay clip file

        Returns:
            Camera config as a dictionary
        """
        # Extract detect config (exclude computed fields)
        detect_dict = source_config.detect.model_dump(
            exclude={"min_initialized", "max_disappeared", "enabled_in_config"}
        )

        # Extract objects config, using .dict() on filters to convert
        # RuntimeFilterConfig ndarray masks back to string coordinates
        objects_dict = {
            "track": source_config.objects.track,
            "mask": {
                mask_id: (
                    mask_cfg.model_dump(
                        exclude={"raw_coordinates", "enabled_in_config"}
                    )
                    if mask_cfg is not None
                    else None
                )
                for mask_id, mask_cfg in source_config.objects.mask.items()
            }
            if source_config.objects.mask
            else {},
            "filters": {
                name: filt.dict() if hasattr(filt, "dict") else filt.model_dump()
                for name, filt in source_config.objects.filters.items()
            },
        }

        # Extract zones (exclude_defaults avoids serializing empty defaults
        # like distances=[] that fail validation on re-parse)
        zones_dict = {}
        for zone_name, zone_config in source_config.zones.items():
            zone_dump = zone_config.model_dump(
                exclude={"contour", "color"}, exclude_defaults=True
            )
            # Always include required fields
            zone_dump.setdefault("coordinates", zone_config.coordinates)
            zones_dict[zone_name] = zone_dump

        # Extract motion config (exclude runtime fields)
        motion_dict = {}
        if source_config.motion is not None:
            motion_dict = source_config.motion.model_dump(
                exclude={
                    "frame_shape",
                    "raw_mask",
                    "mask",
                    "improved_contrast_enabled",
                    "rasterized_mask",
                }
            )

        return {
            "enabled": True,
            "ffmpeg": {
                "inputs": [
                    {
                        "path": clip_path,
                        "roles": ["detect"],
                        "input_args": "-re -stream_loop -1 -fflags +genpts",
                    }
                ],
                "hwaccel_args": [],
            },
            "detect": detect_dict,
            "objects": objects_dict,
            "zones": zones_dict,
            "motion": motion_dict,
            "record": {"enabled": False},
            "snapshots": {"enabled": False},
            "review": {
                "alerts": {"enabled": False},
                "detections": {"enabled": False},
            },
            "birdseye": {"enabled": False},
            "audio": {"enabled": False},
            "lpr": {"enabled": False},
            "face_recognition": {"enabled": False},
        }

    def _cleanup_db(self, camera_name: str) -> None:
        """Defensively remove any database rows for the replay camera."""
        cleanup_camera_db(camera_name)

    def _cleanup_files(self, camera_name: str) -> None:
        """Remove filesystem artifacts for the replay camera."""
        cleanup_camera_files(camera_name)

        # Remove replay-specific cache directory
        if os.path.exists(REPLAY_DIR):
            try:
                shutil.rmtree(REPLAY_DIR)
                logger.debug("Removed replay cache directory")
            except Exception as e:
                logger.error("Failed to remove replay cache: %s", e)


def cleanup_replay_cameras() -> None:
    """Remove any stale replay camera artifacts on startup.

    Since replay cameras are memory-only and never written to YAML, they
    won't appear in the config after a restart. This function cleans up
    filesystem and database artifacts from any replay that was running when
    the process stopped.

    Must be called AFTER the database is bound.
    """
    stale_cameras: set[str] = set()

    # Scan filesystem for leftover replay artifacts to derive camera names
    for dir_path in [RECORD_DIR, CLIPS_DIR, THUMB_DIR]:
        if os.path.isdir(dir_path):
            for entry in os.listdir(dir_path):
                if entry.startswith(REPLAY_CAMERA_PREFIX):
                    stale_cameras.add(entry)

    if os.path.isdir(REPLAY_DIR):
        for entry in os.listdir(REPLAY_DIR):
            if entry.startswith(REPLAY_CAMERA_PREFIX) and entry.endswith(".mp4"):
                stale_cameras.add(entry.removesuffix(".mp4"))

    if not stale_cameras:
        return

    logger.info("Cleaning up stale replay camera artifacts: %s", list(stale_cameras))

    manager = DebugReplayManager()
    for camera_name in stale_cameras:
        manager._cleanup_db(camera_name)
        manager._cleanup_files(camera_name)

    if os.path.exists(REPLAY_DIR):
        try:
            shutil.rmtree(REPLAY_DIR)
        except Exception as e:
            logger.error("Failed to remove replay cache directory: %s", e)
