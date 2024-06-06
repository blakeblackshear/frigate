"""Run recording maintainer and cleanup."""

import logging
import multiprocessing as mp
import signal
import threading
from types import FrameType
from typing import Optional

from playhouse.sqliteq import SqliteQueueDatabase
from setproctitle import setproctitle

from frigate.config import FrigateConfig
from frigate.models import Event, Recordings
from frigate.record.maintainer import RecordingMaintainer
from frigate.util.services import listen

logger = logging.getLogger(__name__)


def manage_recordings(config: FrigateConfig) -> None:
    stop_event = mp.Event()

    def receiveSignal(signalNumber: int, frame: Optional[FrameType]) -> None:
        logger.debug(f"Recording manager process received signal {signalNumber}")
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = "process:recording_manager"
    setproctitle("frigate.recording_manager")
    listen()

    db = SqliteQueueDatabase(
        config.database.path,
        pragmas={
            "auto_vacuum": "FULL",  # Does not defragment database
            "cache_size": -512 * 1000,  # 512MB of cache
            "synchronous": "NORMAL",  # Safe when using WAL https://www.sqlite.org/pragma.html#pragma_synchronous
        },
        timeout=max(60, 10 * len([c for c in config.cameras.values() if c.enabled])),
    )
    models = [Event, Recordings]
    db.bind(models)

    maintainer = RecordingMaintainer(
        config,
        stop_event,
    )
    maintainer.start()
