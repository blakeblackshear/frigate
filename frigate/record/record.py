"""Run recording maintainer and cleanup."""

import logging
import multiprocessing as mp
import signal
import threading

from setproctitle import setproctitle

from playhouse.sqliteq import SqliteQueueDatabase

from frigate.config import FrigateConfig
from frigate.models import Event, Recordings, Timeline
from frigate.record.cleanup import RecordingCleanup
from frigate.record.maintainer import RecordingMaintainer
from frigate.util import listen

logger = logging.getLogger(__name__)


def manage_recordings(
    config: FrigateConfig,
    recordings_info_queue: mp.Queue,
):
    stop_event = mp.Event()

    def receiveSignal(signalNumber, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = "process:recording_manager"
    setproctitle("frigate.recording_manager")
    listen()

    db = SqliteQueueDatabase(config.database.path)
    models = [Event, Recordings, Timeline]
    db.bind(models)

    maintainer = RecordingMaintainer(config, recordings_info_queue, stop_event)
    maintainer.start()

    cleanup = RecordingCleanup(config, stop_event)
    cleanup.start()

    logger.info("recording_manager: exiting subprocess")
