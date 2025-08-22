"""Run recording maintainer and cleanup."""

import logging
from multiprocessing.synchronize import Event as MpEvent

from playhouse.sqliteq import SqliteQueueDatabase

from frigate.config import FrigateConfig
from frigate.const import PROCESS_PRIORITY_HIGH
from frigate.models import Recordings, ReviewSegment
from frigate.record.maintainer import RecordingMaintainer
from frigate.util.process import FrigateProcess

logger = logging.getLogger(__name__)


class RecordProcess(FrigateProcess):
    def __init__(self, config: FrigateConfig, stop_event: MpEvent) -> None:
        super().__init__(
            stop_event,
            PROCESS_PRIORITY_HIGH,
            name="frigate.recording_manager",
            daemon=True,
        )
        self.config = config

    def run(self) -> None:
        self.pre_run_setup(self.config.logger)
        db = SqliteQueueDatabase(
            self.config.database.path,
            pragmas={
                "auto_vacuum": "FULL",  # Does not defragment database
                "cache_size": -512 * 1000,  # 512MB of cache
                "synchronous": "NORMAL",  # Safe when using WAL https://www.sqlite.org/pragma.html#pragma_synchronous
            },
            timeout=max(
                60, 10 * len([c for c in self.config.cameras.values() if c.enabled])
            ),
        )
        models = [ReviewSegment, Recordings]
        db.bind(models)

        maintainer = RecordingMaintainer(
            self.config,
            self.stop_event,
        )
        maintainer.start()
