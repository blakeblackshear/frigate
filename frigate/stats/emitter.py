"""Emit stats to listeners."""

import itertools
import json
import logging
import threading
import time
from multiprocessing.synchronize import Event as MpEvent
from typing import Any

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.const import FREQUENCY_STATS_POINTS
from frigate.notices import flush_notices, raise_notice, resolve_kind, resolve_notice
from frigate.stats.hardware import HardwareStats
from frigate.stats.prometheus import update_metrics
from frigate.stats.util import get_latest_version, is_newer_version, stats_snapshot
from frigate.types import StatsTrackingTypes
from frigate.version import VERSION

logger = logging.getLogger(__name__)


MAX_STATS_POINTS = 80

# how often to ask GitHub for the latest release
VERSION_REFRESH_S = 24 * 60 * 60

# a camera skipping at least this percent of its frames is falling behind
SKIPPED_DETECTIONS_PCT = 5

# lifetime CPU averages at or above these are high; they match
# CameraFfmpegThreshold.error and CameraDetectThreshold.error in the UI
FFMPEG_HIGH_CPU_PCT = 20
DETECT_HIGH_CPU_PCT = 40

# a camera stays over a threshold this long before it becomes a notice
EPISODE_HOLD_S = 60

# detectors warm up after a start; the status bar waits this long too
STARTUP_GRACE_S = 120


def cpu_average(cpu_usages: dict[str, Any], pid: int | None) -> float | None:
    """A process's CPU use averaged over its lifetime, or None if unknown."""
    usage = cpu_usages.get(str(pid)) if pid else None

    try:
        return float(usage["cpu_average"]) if usage else None
    except (KeyError, TypeError, ValueError):
        return None


class EpisodeTracker:
    """Finds cameras whose value stays over a threshold long enough for a notice."""

    def __init__(self, threshold: float) -> None:
        self._threshold = threshold
        self._since: dict[str, float] = {}
        self._raised: set[str] = set()

    def update(self, values: dict[str, float | None], now: float) -> list[str]:
        """Return the cameras whose episode qualified on this sample.

        Args:
            values: Each camera's current value, or None when it has none
            now: Sample time in seconds
        """
        qualified: list[str] = []

        # a removed camera that comes back starts a new episode
        for camera in self._since.keys() - values.keys():
            self._since.pop(camera)
            self._raised.discard(camera)

        for camera, value in values.items():
            if value is None or value < self._threshold:
                self._since.pop(camera, None)
                self._raised.discard(camera)
                continue

            since = self._since.setdefault(camera, now)

            if camera not in self._raised and now - since >= EPISODE_HOLD_S:
                self._raised.add(camera)
                qualified.append(camera)

        return qualified


class StatsEmitter(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        stats_tracking: StatsTrackingTypes,
        stop_event: MpEvent,
    ):
        super().__init__(name="frigate_stats_emitter")
        self.config = config
        self.stats_tracking = stats_tracking
        self.stop_event = stop_event
        self.hardware_stats = HardwareStats(config)
        self.stats_history: list[dict[str, Any]] = []
        self.skipped_detections = EpisodeTracker(SKIPPED_DETECTIONS_PCT)
        self.ffmpeg_cpu = EpisodeTracker(FFMPEG_HIGH_CPU_PCT)
        self.detect_cpu = EpisodeTracker(DETECT_HIGH_CPU_PCT)

        # the shm notice's params as last sent, so only a change is written
        self._shm_checked = False
        self._shm_params: dict[str, Any] | None = None

        # create communication for stats
        self.requestor = InterProcessRequestor()

    def get_latest_stats(self) -> dict[str, Any]:
        """Get latest stats."""
        if len(self.stats_history) > 0:
            return self.stats_history[-1]
        else:
            stats = stats_snapshot(
                self.config, self.stats_tracking, self.hardware_stats
            )
            self.stats_history.append(stats)
            return stats

    def get_stats_history(self, keys: list[str] | None = None) -> list[dict[str, Any]]:
        """Get stats history.

        Supports dot-notation for nested keys to avoid returning large objects
        when only specific subfields are needed. Handles two patterns:

        - Flat dict: "service.last_updated" returns {"service": {"last_updated": ...}}
        - Dict-of-dicts: "cameras.camera_fps" returns each camera entry filtered
          to only include "camera_fps"
        """
        if not keys:
            return self.stats_history

        # Pre-parse keys into top-level keys and dot-notation fields
        top_level_keys: list[str] = []
        nested_keys: dict[str, list[str]] = {}

        for k in keys:
            if "." in k:
                parent_key, child_key = k.split(".", 1)
                nested_keys.setdefault(parent_key, []).append(child_key)
            else:
                top_level_keys.append(k)

        selected_stats: list[dict[str, Any]] = []

        for s in self.stats_history:
            selected: dict[str, Any] = {}

            for k in top_level_keys:
                selected[k] = s.get(k)

            for parent_key, child_keys in nested_keys.items():
                parent = s.get(parent_key)

                if not isinstance(parent, dict):
                    selected[parent_key] = parent
                    continue

                # Check if values are dicts (dict-of-dicts like cameras/detectors)
                first_value = next(iter(parent.values()), None)

                if isinstance(first_value, dict):
                    # Filter each nested entry to only requested fields,
                    # omitting None values to preserve key-absence semantics
                    selected[parent_key] = {
                        entry_key: {
                            field: val
                            for field in child_keys
                            if (val := entry.get(field)) is not None
                        }
                        for entry_key, entry in parent.items()
                    }
                else:
                    # Flat dict (like service) - pick individual fields
                    if parent_key not in selected:
                        selected[parent_key] = {}

                    for child_key in child_keys:
                        selected[parent_key][child_key] = parent.get(child_key)

            selected_stats.append(selected)

        return selected_stats

    def stats_init(config, camera_metrics, detectors, processes):
        stats = {
            "cameras": camera_metrics,
            "detectors": detectors,
            "processes": processes,
        }
        # Update Prometheus metrics with initial stats
        update_metrics(stats)
        return stats

    def _check_update_notice(self) -> None:
        """Raise or resolve the update notice from the tracked latest version."""
        latest = self.stats_tracking["latest_frigate_version"]

        # a failed lookup says nothing about whether an update exists
        if latest == "unknown":
            return

        if is_newer_version(VERSION, latest):
            raise_notice("update_available", scope=latest, params={"version": latest})
        else:
            resolve_kind("update_available")

    def _refresh_latest_version(self) -> None:
        """Refresh the latest release on a daemon thread so the request never stalls stats."""

        def refresh() -> None:
            latest = get_latest_version(self.config)

            # keep the last good value; stats surface it as service.latest_version
            if latest != "unknown":
                self.stats_tracking["latest_frigate_version"] = latest

            self._check_update_notice()

        threading.Thread(
            target=refresh, name="frigate_version_check", daemon=True
        ).start()

    def _update_shm_notice(self, shm: dict[str, Any]) -> None:
        """Raise the shm notice while /dev/shm is smaller than the cameras need."""
        params = (
            {"total": shm["total"], "min": shm["min_shm"]}
            if shm and shm["total"] < shm["min_shm"]
            else None
        )

        # the first tick always sends, so a row the last run left is raised
        # again or cleared
        if self._shm_checked and params == self._shm_params:
            return

        self._shm_checked = True
        self._shm_params = params

        if params is None:
            resolve_notice("shm_too_low")
        else:
            raise_notice("shm_too_low", params=params)

    def _update_notices(self, stats: dict[str, Any], now: float) -> None:
        """Update notices based on current stats or time."""
        cameras = stats["cameras"]

        # absent when CPU collection timed out or failed on this tick
        cpu_usages = stats.get("cpu_usages", {})

        if stats["service"]["uptime"] >= STARTUP_GRACE_S:
            # skipped detections
            skipped = {
                camera: camera_stats["skipped_pct"]
                for camera, camera_stats in cameras.items()
            }

            for camera in self.skipped_detections.update(skipped, now):
                raise_notice(
                    "skipped_detections",
                    scope=camera,
                    params={"pct": skipped[camera]},
                )

            # high ffmpeg and detect CPU
            for tracker, kind, pid_key in (
                (self.ffmpeg_cpu, "ffmpeg_high_cpu", "ffmpeg_pid"),
                (self.detect_cpu, "detect_high_cpu", "pid"),
            ):
                averages = {
                    camera: cpu_average(cpu_usages, camera_stats.get(pid_key))
                    for camera, camera_stats in cameras.items()
                }

                for camera in tracker.update(averages, now):
                    raise_notice(kind, scope=camera, params={"cpu": averages[camera]})

        # shm too small for the cameras
        self._update_shm_notice(stats["service"]["storage"]["/dev/shm"])

        # repeats of batched kinds, such as failed logins
        flush_notices()

        # add any additional notice types here

    def run(self) -> None:
        time.sleep(10)
        self._check_update_notice()
        last_version_check = time.time()
        for counter in itertools.cycle(
            range(int(self.config.mqtt.stats_interval / FREQUENCY_STATS_POINTS))
        ):
            if self.stop_event.wait(FREQUENCY_STATS_POINTS):
                break

            if time.time() - last_version_check >= VERSION_REFRESH_S:
                self._refresh_latest_version()
                last_version_check = time.time()

            logger.debug("Starting stats collection")
            stats = stats_snapshot(
                self.config, self.stats_tracking, self.hardware_stats
            )
            self.stats_history.append(stats)
            self.stats_history = self.stats_history[-MAX_STATS_POINTS:]
            self._update_notices(stats, time.time())

            if counter == 0:
                self.requestor.send_data("stats", json.dumps(stats))

            logger.debug("Finished stats collection")

        # write the repeats held back since the last tick
        flush_notices()
        self.hardware_stats.stop()
        logger.info("Exiting stats emitter...")
