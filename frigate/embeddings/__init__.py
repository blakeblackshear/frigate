"""SQLite-vec embeddings database."""

import json
import logging
import multiprocessing as mp
import os
import signal
import threading
from types import FrameType
from typing import Optional

from setproctitle import setproctitle

from frigate.config import FrigateConfig
from frigate.const import CONFIG_DIR
from frigate.db.sqlitevecq import SqliteVecQueueDatabase
from frigate.models import Event
from frigate.util.services import listen

from .embeddings import Embeddings
from .maintainer import EmbeddingMaintainer
from .util import ZScoreNormalization

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
    db = SqliteVecQueueDatabase(
        config.database.path,
        pragmas={
            "auto_vacuum": "FULL",  # Does not defragment database
            "cache_size": -512 * 1000,  # 512MB of cache
            "synchronous": "NORMAL",  # Safe when using WAL https://www.sqlite.org/pragma.html#pragma_synchronous
        },
        timeout=max(60, 10 * len([c for c in config.cameras.values() if c.enabled])),
        load_vec_extension=True,
    )
    models = [Event]
    db.bind(models)

    embeddings = Embeddings(config.semantic_search, db)

    # Check if we need to re-index events
    if config.semantic_search.reindex:
        embeddings.reindex()

    maintainer = EmbeddingMaintainer(
        db,
        config,
        stop_event,
    )
    maintainer.start()


class EmbeddingsContext:
    def __init__(self, config: FrigateConfig, db: SqliteVecQueueDatabase):
        self.embeddings = Embeddings(config.semantic_search, db)
        self.thumb_stats = ZScoreNormalization()
        self.desc_stats = ZScoreNormalization()

        # load stats from disk
        try:
            with open(os.path.join(CONFIG_DIR, ".search_stats.json"), "r") as f:
                data = json.loads(f.read())
                self.thumb_stats.from_dict(data["thumb_stats"])
                self.desc_stats.from_dict(data["desc_stats"])
        except FileNotFoundError:
            pass

    def save_stats(self):
        """Write the stats to disk as JSON on exit."""
        contents = {
            "thumb_stats": self.thumb_stats.to_dict(),
            "desc_stats": self.desc_stats.to_dict(),
        }
        with open(os.path.join(CONFIG_DIR, ".search_stats.json"), "w") as f:
            json.dump(contents, f)
