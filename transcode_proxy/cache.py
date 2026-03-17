"""In-memory LRU cache for transcoded segments (byte-size limited)."""
import logging
import threading
from collections import OrderedDict
from typing import Optional

logger = logging.getLogger(__name__)


class ByteLRUCache:
    """LRU cache that evicts by total byte size."""

    def __init__(self, max_bytes: int):
        self._max_bytes = max_bytes
        self._current_bytes = 0
        self._order: OrderedDict[str, bytes] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[bytes]:
        with self._lock:
            data = self._order.pop(key, None)
            if data is not None:
                self._order[key] = data  # move to end (most recent)
                return data
            return None

    def set(self, key: str, value: bytes) -> None:
        size = len(value)
        if size > self._max_bytes:
            logger.warning("Segment larger than cache max (%s bytes), not caching", size)
            return
        with self._lock:
            while self._current_bytes + size > self._max_bytes and self._order:
                evicted_key = next(iter(self._order))
                evicted = self._order.pop(evicted_key)
                self._current_bytes -= len(evicted)
                logger.debug("Evicted %s from transcode cache", evicted_key)
            self._order[key] = value
            self._current_bytes += size

    def size_bytes(self) -> int:
        with self._lock:
            return self._current_bytes

    def count(self) -> int:
        with self._lock:
            return len(self._order)
