"""Debug replay camera management for replaying recordings with detection overlays.

The startup work (ffmpeg concat + camera config publish) lives in
``frigate.jobs.debug_replay``. This module owns only session presence
(``active``), session metadata, and post-session cleanup.
"""

import logging
import os
import shutil
import threading

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
from frigate.jobs.debug_replay import cancel_debug_replay_job, wait_for_runner
from frigate.util.camera_cleanup import cleanup_camera_db, cleanup_camera_files
from frigate.util.config import find_config_file

logger = logging.getLogger(__name__)


class DebugReplayManager:
    """Owns the lifecycle pointers for a single debug replay session.

    A session exists from the moment ``mark_starting`` is called (synchronously,
    inside the API handler) until ``clear_session`` runs (on success cleanup,
    failure, or stop). The ``active`` property is the source of truth that the
    status bar consumes — broader than the startup job, which only covers the
    preparing_clip / starting_camera window.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.replay_camera_name: str | None = None
        self.source_camera: str | None = None
        self.clip_path: str | None = None
        self.start_ts: float | None = None
        self.end_ts: float | None = None

    @property
    def active(self) -> bool:
        """True from ``mark_starting`` until ``clear_session``."""
        return self.replay_camera_name is not None

    def mark_starting(
        self,
        source_camera: str,
        replay_camera_name: str,
        start_ts: float,
        end_ts: float,
    ) -> None:
        """Synchronously claim the session before the job runner starts.

        Called inside the API handler so the status bar sees ``active=True``
        immediately, before the worker thread does any ffmpeg work.
        """
        with self._lock:
            self.replay_camera_name = replay_camera_name
            self.source_camera = source_camera
            self.start_ts = start_ts
            self.end_ts = end_ts
            self.clip_path = None

    def mark_session_ready(self, clip_path: str) -> None:
        """Record the on-disk clip path after the camera has been published."""
        with self._lock:
            self.clip_path = clip_path

    def clear_session(self) -> None:
        """Reset session pointers without publishing camera removal.

        Used by the job runner on failure paths. ``stop()`` does the camera
        teardown plus this clear in one step.
        """
        with self._lock:
            self._clear_locked()

    def _clear_locked(self) -> None:
        self.replay_camera_name = None
        self.source_camera = None
        self.clip_path = None
        self.start_ts = None
        self.end_ts = None

    def publish_camera(
        self,
        source_camera: str,
        replay_name: str,
        clip_path: str,
        frigate_config: FrigateConfig,
        config_publisher: CameraConfigUpdatePublisher,
    ) -> None:
        """Build the in-memory replay camera config and publish the add event.

        Called by the job runner during the ``starting_camera`` phase.
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
        """Cancel any in-flight startup job and tear down the active session.

        Safe to call when no session is active (no-op with a warning).
        """
        cancel_debug_replay_job()
        wait_for_runner(timeout=2.0)

        with self._lock:
            if not self.active:
                logger.warning("No active replay session to stop")
                return

            replay_name = self.replay_camera_name

            # Only publish remove if the camera was actually added to the live
            # config (i.e. the runner reached the starting_camera phase).
            if replay_name is not None and replay_name in frigate_config.cameras:
                config_publisher.publish_update(
                    CameraConfigUpdateTopic(CameraConfigUpdateEnum.remove, replay_name),
                    frigate_config.cameras[replay_name],
                )

            if replay_name is not None:
                self._cleanup_db(replay_name)
                self._cleanup_files(replay_name)

            self._clear_locked()

            logger.info("Debug replay stopped and cleaned up: %s", replay_name)

    def _build_camera_config_dict(
        self,
        source_config,
        replay_name: str,
        clip_path: str,
    ) -> dict:
        """Build a camera config dictionary for the replay camera."""
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
