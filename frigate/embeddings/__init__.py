"""ChromaDB embeddings database."""

import logging
import multiprocessing as mp
import signal
import sys
import threading
from types import FrameType
from typing import Optional

from playhouse.sqliteq import SqliteQueueDatabase
from setproctitle import setproctitle

from frigate.config import FrigateConfig
from frigate.models import Event
from frigate.util.services import listen

logger = logging.getLogger(__name__)


def manage_embeddings(config: FrigateConfig) -> None:
    # Only initialize embeddings if semantic search is enabled
    if not config.semantic_search.enabled:
        return

    stop_event = mp.Event()

    def receiveSignal(signalNumber: int, frame: Optional[FrameType]) -> None:
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = "process:embeddings_manager"
    setproctitle("frigate.embeddings_manager")
    listen()

    # Configure Frigate DB
    db = SqliteQueueDatabase(
        config.database.path,
        pragmas={
            "auto_vacuum": "FULL",  # Does not defragment database
            "cache_size": -512 * 1000,  # 512MB of cache
            "synchronous": "NORMAL",  # Safe when using WAL https://www.sqlite.org/pragma.html#pragma_synchronous
        },
        timeout=max(60, 10 * len([c for c in config.cameras.values() if c.enabled])),
    )
    models = [Event]
    db.bind(models)

    # Hotsawp the sqlite3 module for Chroma compatibility
    __import__("pysqlite3")
    sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")
    from .embeddings import Embeddings
    from .maintainer import EmbeddingMaintainer

    embeddings = Embeddings()

    # Check if we need to re-index events
    if config.semantic_search.reindex:
        embeddings.reindex()

    maintainer = EmbeddingMaintainer(
        config,
        stop_event,
    )
    maintainer.start()
