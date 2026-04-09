"""Pure, stateless helpers used by the chat tool dispatchers.

These were extracted from frigate/api/chat.py to keep that module focused on
route handlers, tool dispatchers, and streaming loop internals. Nothing in
this file touches the FastAPI request, the embeddings context, or the chat
loop state — all inputs and outputs are plain data.
"""

import logging
import math
import time
from datetime import datetime
from typing import Any, Dict, Generator, List, Optional

from frigate.embeddings.util import ZScoreNormalization
from frigate.models import Event

logger = logging.getLogger(__name__)


# Similarity fusion weights for find_similar_objects.
# Visual dominates because the feature's primary use case is "same specific object."
# If these change, update the test in test_chat_find_similar_objects.py.
VISUAL_WEIGHT = 0.65
DESCRIPTION_WEIGHT = 0.35


def chunk_content(content: str, chunk_size: int = 80) -> Generator[str, None, None]:
    """Yield content in word-aware chunks for streaming."""
    if not content:
        return
    words = content.split(" ")
    current: List[str] = []
    current_len = 0
    for w in words:
        current.append(w)
        current_len += len(w) + 1
        if current_len >= chunk_size:
            yield " ".join(current) + " "
            current = []
            current_len = 0
    if current:
        yield " ".join(current)


def format_events_with_local_time(
    events_list: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Add human-readable local start/end times to each event for the LLM."""
    result = []
    for evt in events_list:
        if not isinstance(evt, dict):
            result.append(evt)
            continue
        copy_evt = dict(evt)
        try:
            start_ts = evt.get("start_time")
            end_ts = evt.get("end_time")
            if start_ts is not None:
                dt_start = datetime.fromtimestamp(start_ts)
                copy_evt["start_time_local"] = dt_start.strftime("%Y-%m-%d %I:%M:%S %p")
            if end_ts is not None:
                dt_end = datetime.fromtimestamp(end_ts)
                copy_evt["end_time_local"] = dt_end.strftime("%Y-%m-%d %I:%M:%S %p")
        except (TypeError, ValueError, OSError):
            pass
        result.append(copy_evt)
    return result


def distance_to_score(distance: float, stats: ZScoreNormalization) -> float:
    """Convert a cosine distance to a [0, 1] similarity score.

    Uses the existing ZScoreNormalization stats maintained by EmbeddingsContext
    to normalize across deployments, then a bounded sigmoid. Lower distance ->
    higher score. If stats are uninitialized (stddev == 0), returns a neutral
    0.5 so the fallback ordering by raw distance still dominates.
    """
    if stats.stddev == 0:
        return 0.5
    z = (distance - stats.mean) / stats.stddev
    # Sigmoid on -z so that small distance (good) -> high score.
    return 1.0 / (1.0 + math.exp(z))


def fuse_scores(
    visual_score: Optional[float],
    description_score: Optional[float],
) -> Optional[float]:
    """Weighted fusion of visual and description similarity scores.

    If one side is missing (e.g., no description embedding for this event),
    the other side's score is returned alone with no penalty. If both are
    missing, returns None and the caller should drop the event.
    """
    if visual_score is None and description_score is None:
        return None
    if visual_score is None:
        return description_score
    if description_score is None:
        return visual_score
    return VISUAL_WEIGHT * visual_score + DESCRIPTION_WEIGHT * description_score


def parse_iso_to_timestamp(value: Optional[str]) -> Optional[float]:
    """Parse an ISO-8601 string as server-local time -> unix timestamp.

    Mirrors the parsing _execute_search_objects uses so both tools accept the
    same format from the LLM.
    """
    if value is None:
        return None
    try:
        s = value.replace("Z", "").strip()[:19]
        dt = datetime.strptime(s, "%Y-%m-%dT%H:%M:%S")
        return time.mktime(dt.timetuple())
    except (ValueError, AttributeError, TypeError):
        logger.warning("Invalid timestamp format: %s", value)
        return None


def hydrate_event(event: Event, score: Optional[float] = None) -> Dict[str, Any]:
    """Convert an Event row into the dict shape returned by find_similar_objects."""
    data: Dict[str, Any] = {
        "id": event.id,
        "camera": event.camera,
        "label": event.label,
        "sub_label": event.sub_label,
        "start_time": event.start_time,
        "end_time": event.end_time,
        "zones": event.zones,
    }
    if score is not None:
        data["score"] = score
    return data
