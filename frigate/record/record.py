"""Run recording maintainer and cleanup."""

import logging

from playhouse.sqliteq import SqliteQueueDatabase

from frigate import util
from frigate.config import FrigateConfig
from frigate.models import Recordings, ReviewSegment
from frigate.record.maintainer import RecordingMaintainer

logger = logging.getLogger(__name__)


class ManageRecordings(util.Process):
    def __init__(self, config: FrigateConfig):
        super().__init__(name="frigate.recording_manager", daemon=True)
        self.config = config

    def run(self):
        db = SqliteQueueDatabase(
            self.config.database.path,
            pragmas={
                "auto_vacuum": "FULL",  # Does not defragment database
                "cache_size": -512 * 1000,  # 512MB of cache
                "synchronous": "NORMAL",  # Safe when using WAL https://www.sqlite.org/pragma.html#pragma_synchronous
            },
            timeout=max(60, sum(10 for c in self.config.cameras.values() if c.enabled)),
        )
        models = [ReviewSegment, Recordings]
        db.bind(models)

        maintainer = RecordingMaintainer(
            self.config,
            self.stop_event,
        )
        maintainer.start()
