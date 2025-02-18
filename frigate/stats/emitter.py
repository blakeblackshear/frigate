"""Emit stats to listeners."""

import itertools
import json
import logging
import threading
import time
from multiprocessing.synchronize import Event as MpEvent
from typing import Optional

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.const import FREQUENCY_STATS_POINTS
from frigate.stats.prometheus import update_metrics
from frigate.stats.util import stats_snapshot
from frigate.types import StatsTrackingTypes

logger = logging.getLogger(__name__)


MAX_STATS_POINTS = 80


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
        self.hwaccel_errors: list[str] = []
        self.stats_history: list[dict[str, any]] = []

        # create communication for stats
        self.requestor = InterProcessRequestor()

    def get_latest_stats(self) -> dict[str, any]:
        """Get latest stats."""
        if len(self.stats_history) > 0:
            return self.stats_history[-1]
        else:
            stats = stats_snapshot(
                self.config, self.stats_tracking, self.hwaccel_errors
            )
            self.stats_history.append(stats)
            return stats

    def get_stats_history(
        self, keys: Optional[list[str]] = None
    ) -> list[dict[str, any]]:
        """Get stats history."""
        if not keys:
            return self.stats_history

        selected_stats: list[dict[str, any]] = []

        for s in self.stats_history:
            selected = {}

            for k in keys:
                selected[k] = s.get(k)

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

    def run(self) -> None:
        time.sleep(10)
        for counter in itertools.cycle(
            range(int(self.config.mqtt.stats_interval / FREQUENCY_STATS_POINTS))
        ):
            if self.stop_event.wait(FREQUENCY_STATS_POINTS):
                break

            logger.debug("Starting stats collection")
            stats = stats_snapshot(
                self.config, self.stats_tracking, self.hwaccel_errors
            )
            self.stats_history.append(stats)
            self.stats_history = self.stats_history[-MAX_STATS_POINTS:]

            if counter == 0:
                self.requestor.send_data("stats", json.dumps(stats))

            logger.debug("Finished stats collection")

        logger.info("Exiting stats emitter...")
