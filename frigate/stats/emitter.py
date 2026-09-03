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
from frigate.notices.registry import NoticeRegistry
from frigate.stats.hardware import HardwareStats
from frigate.stats.prometheus import update_metrics
from frigate.stats.util import get_latest_version, is_newer_version, stats_snapshot
from frigate.types import StatsTrackingTypes
from frigate.version import VERSION

logger = logging.getLogger(__name__)


MAX_STATS_POINTS = 80

# how often to ask GitHub for the latest release
VERSION_REFRESH_S = 24 * 60 * 60


class StatsEmitter(threading.Thread):
    def __init__(
        self,
        config: FrigateConfig,
        stats_tracking: StatsTrackingTypes,
        stop_event: MpEvent,
        notice_registry: NoticeRegistry | None = None,
    ):
        super().__init__(name="frigate_stats_emitter")
        self.config = config
        self.stats_tracking = stats_tracking
        self.stop_event = stop_event
        self.notice_registry = notice_registry
        self.hardware_stats = HardwareStats(config)
        self.stats_history: list[dict[str, Any]] = []

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
        if self.notice_registry is None:
            return

        latest = self.stats_tracking["latest_frigate_version"]

        if is_newer_version(VERSION, latest):
            self.notice_registry.raise_notice(
                "update_available", params={"version": latest}
            )
        else:
            self.notice_registry.resolve("update_available")

    def _refresh_latest_version(self) -> None:
        """Refresh the latest release on a daemon thread so the request never stalls stats."""

        def refresh() -> None:
            self.stats_tracking["latest_frigate_version"] = get_latest_version(
                self.config
            )
            self._check_update_notice()

        threading.Thread(
            target=refresh, name="frigate_version_check", daemon=True
        ).start()

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

            if counter == 0:
                self.requestor.send_data("stats", json.dumps(stats))

            logger.debug("Finished stats collection")

        self.hardware_stats.stop()
        logger.info("Exiting stats emitter...")
