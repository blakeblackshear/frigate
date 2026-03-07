"""VOD query, normalization, and payload assembly helpers."""

import logging
import threading
import time
from collections import OrderedDict

from frigate.const import MAX_SEGMENT_DURATION
from frigate.models import Recordings

logger = logging.getLogger(__name__)


def _get_recordings_for_vod(
    camera_name: str, start_ts: float, end_ts: float
) -> list[dict]:
    """Query recordings that overlap the requested time range.

    Uses the canonical overlap predicate: two intervals [A, B) and [C, D)
    overlap iff A < D AND C < B. This is index-friendly and equivalent to
    the previous OR-based predicate for playback purposes.
    """
    recordings = (
        Recordings.select(
            Recordings.path,
            Recordings.duration,
            Recordings.end_time,
            Recordings.start_time,
        )
        .where(
            (Recordings.camera == camera_name)
            & (Recordings.end_time > start_ts)
            & (Recordings.start_time < end_ts)
        )
        .order_by(Recordings.start_time.asc())
        .iterator()
    )

    results = []
    for recording in recordings:
        results.append(
            {
                "path": recording.path,
                "duration": recording.duration,
                "start_time": recording.start_time,
                "end_time": recording.end_time,
            }
        )
    return results


def _normalize_recordings_to_vod_clips(
    recordings: list[dict], start_ts: float, end_ts: float
) -> tuple[list[dict], list[int]]:
    """Convert raw recording rows into trimmed VOD clips with durations.

    Returns a tuple of (clips, durations) where clips are nginx-vod source
    clip dicts and durations are in milliseconds.
    """
    clips = []
    durations = []
    min_duration_ms = 100  # Minimum 100ms to ensure at least one video frame
    max_duration_ms = MAX_SEGMENT_DURATION * 1000

    for rec in recordings:
        logger.debug(
            "VOD: processing recording: %s start=%s end=%s duration=%s",
            rec["path"],
            rec["start_time"],
            rec["end_time"],
            rec["duration"],
        )

        clip: dict = {"type": "source", "path": rec["path"]}
        duration = int(rec["duration"] * 1000)

        # adjust start offset if start_ts is after recording start
        if start_ts > rec["start_time"]:
            inpoint = int((start_ts - rec["start_time"]) * 1000)
            clip["clipFrom"] = inpoint
            duration -= inpoint
            logger.debug(
                "VOD: applied clipFrom %sms to %s",
                inpoint,
                rec["path"],
            )

        # adjust end if recording ends after end_ts
        if rec["end_time"] > end_ts:
            duration -= int((rec["end_time"] - end_ts) * 1000)

        if duration < min_duration_ms:
            logger.debug(
                "VOD: skipping recording %s - resulting duration %sms too short",
                rec["path"],
                duration,
            )
            continue

        if min_duration_ms <= duration < max_duration_ms:
            clip["keyFrameDurations"] = [duration]
            clips.append(clip)
            durations.append(duration)
            logger.debug(
                "VOD: added clip %s duration_ms=%s clipFrom=%s",
                rec["path"],
                duration,
                clip.get("clipFrom"),
            )
        else:
            logger.warning(f"Recording clip is missing or empty: {rec['path']}")

    return clips, durations


def _build_vod_mapping_payload(
    clips: list[dict],
    durations: list[int],
    start_ts: float,
    force_discontinuity: bool,
    is_cacheable: bool,
) -> dict:
    """Assemble the final VOD mapping response payload."""
    return {
        "cache": is_cacheable,
        "discontinuity": force_discontinuity,
        "consistentSequenceMediaInfo": True,
        "durations": durations,
        "segment_duration": max(durations),
        "sequences": [{"clips": clips}],
    }


# ---------------------------------------------------------------------------
# In-process LRU cache for historical VOD mapping payloads (A3)
# ---------------------------------------------------------------------------

_VOD_CACHE_MAX_SIZE = 256
_VOD_CACHE_TTL_SECONDS = 300  # 5 minutes


class _VodMappingCache:
    """Thread-safe bounded LRU cache for historical VOD payloads."""

    def __init__(self, max_size: int = _VOD_CACHE_MAX_SIZE, ttl: float = _VOD_CACHE_TTL_SECONDS):
        self._max_size = max_size
        self._ttl = ttl
        self._cache: OrderedDict[tuple, tuple[float, dict]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: tuple) -> dict | None:
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            ts, payload = entry
            if time.monotonic() - ts > self._ttl:
                del self._cache[key]
                return None
            # Move to end (most recently used)
            self._cache.move_to_end(key)
            return payload

    def put(self, key: tuple, payload: dict) -> None:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                self._cache[key] = (time.monotonic(), payload)
            else:
                if len(self._cache) >= self._max_size:
                    self._cache.popitem(last=False)
                self._cache[key] = (time.monotonic(), payload)


vod_mapping_cache = _VodMappingCache()
