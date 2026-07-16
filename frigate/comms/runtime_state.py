"""Persistence layer for dispatcher runtime state overrides."""

import json
import logging
import os
from collections.abc import Iterable
from typing import Any

from filelock import FileLock, Timeout

from frigate.util.config import find_config_file

logger = logging.getLogger(__name__)


class RuntimeStatePersistence:
    """Persist last-known runtime states for dispatcher toggles.

    Stores boolean overrides applied to camera-level toggles by the dispatcher.
    Overrides are replayed at startup on top of the YAML-derived in-memory
    config, so changes made via MQTT or the live-view UI survive a restart.
    """

    # Maps dispatcher topic name -> YAML key suffix under cameras.<cam>
    TRACKED_TOPICS: dict[str, str] = {
        "enabled": "enabled",
        "detect": "detect.enabled",
        "snapshots": "snapshots.enabled",
        "recordings": "record.enabled",
        "audio": "audio.enabled",
    }

    _SUFFIX_TO_TOPIC: dict[str, str] = {v: k for k, v in TRACKED_TOPICS.items()}

    def __init__(self) -> None:
        self._path = os.path.join(
            os.path.dirname(find_config_file()), ".runtime_state.json"
        )
        self._lock_path = f"{self._path}.lock"
        self._lock_timeout = 5

    def load(self) -> dict[str, dict[str, bool]]:
        """Return {camera: {topic: bool}} or {} if missing/corrupt."""
        try:
            with FileLock(self._lock_path, timeout=self._lock_timeout):
                data = self._read_locked()
        except Timeout:
            logger.error("Timed out acquiring runtime state lock for load")
            return {}
        cameras = data.get("cameras", {})
        if not isinstance(cameras, dict):
            return {}
        # Filter out malformed camera entries so callers can trust the shape.
        return {
            name: features
            for name, features in cameras.items()
            if isinstance(features, dict)
        }

    def set(self, camera: str, topic: str, value: bool) -> None:
        """Persist a single (camera, topic, value). No-op if topic untracked."""
        if topic not in self.TRACKED_TOPICS:
            return
        try:
            with FileLock(self._lock_path, timeout=self._lock_timeout):
                data = self._read_locked()
                cameras = data.setdefault("cameras", {})
                if not isinstance(cameras, dict):
                    cameras = {}
                    data["cameras"] = cameras
                cam = cameras.setdefault(camera, {})
                if not isinstance(cam, dict):
                    cam = {}
                    cameras[camera] = cam
                cam[topic] = bool(value)
                self._write_locked(data)
        except Timeout:
            logger.error("Timed out persisting runtime state for %s/%s", camera, topic)
        except OSError:
            logger.exception("Failed to persist runtime state for %s/%s", camera, topic)

    def clear_all(self) -> None:
        """Wipe every stored runtime override.

        Called when the "layer below" changes in a way that invalidates all
        runtime overrides for the current session (currently: profile
        activation or deactivation).
        """
        try:
            with FileLock(self._lock_path, timeout=self._lock_timeout):
                if not os.path.exists(self._path):
                    return
                self._write_locked({"cameras": {}})
        except Timeout:
            logger.error("Timed out clearing runtime state")
        except OSError:
            logger.exception("Failed to clear runtime state")

    def clear_for_yaml_keys(self, dotted_keys: Iterable[str]) -> None:
        """Remove stored entries whose YAML key was just rewritten.

        Each dotted key must be of the form ``cameras.<camera>.<suffix>``.
        Keys that don't match a tracked topic are ignored.
        """
        to_remove: list[tuple[str, str]] = []
        for key in dotted_keys:
            parts = key.split(".")
            if len(parts) < 3 or parts[0] != "cameras":
                continue
            camera = parts[1]
            suffix = ".".join(parts[2:])
            topic = self._SUFFIX_TO_TOPIC.get(suffix)
            if topic is not None:
                to_remove.append((camera, topic))

        if not to_remove:
            return

        try:
            with FileLock(self._lock_path, timeout=self._lock_timeout):
                data = self._read_locked()
                cameras = data.get("cameras")
                if not isinstance(cameras, dict):
                    return
                changed = False
                for camera, topic in to_remove:
                    cam = cameras.get(camera)
                    if isinstance(cam, dict) and topic in cam:
                        del cam[topic]
                        changed = True
                        if not cam:
                            del cameras[camera]
                if changed:
                    self._write_locked(data)
        except Timeout:
            logger.error("Timed out clearing runtime state for YAML keys")
        except OSError:
            logger.exception("Failed to clear runtime state for YAML keys")

    def _read_locked(self) -> dict[str, Any]:
        """Read the JSON file while the FileLock is held.

        Returns ``{}`` on a missing or corrupt file so the caller can write a
        fresh structure on the next mutation.
        """
        if not os.path.exists(self._path):
            return {}
        try:
            with open(self._path) as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            logger.exception(
                "Failed to read runtime state file %s; starting fresh", self._path
            )
            return {}
        return data if isinstance(data, dict) else {}

    def _write_locked(self, data: dict[str, Any]) -> None:
        """Atomically write the JSON file while the FileLock is held."""
        tmp_path = f"{self._path}.tmp"
        with open(tmp_path, "w") as f:
            json.dump(data, f, indent=2, sort_keys=True)
        os.replace(tmp_path, self._path)
