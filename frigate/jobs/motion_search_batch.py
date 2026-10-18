"""Pure helpers for VOD-batched motion search.

Coalescing gate-passing segments into time-contiguous runs, mapping a frame's
VOD stream time back to an absolute timestamp, and thinning sample times to a
target interval. No I/O or ffmpeg here so the tricky math stays unit-testable.
"""

from bisect import bisect_right
from typing import Any


def coalesce_runs(
    segments: list[Any], max_seconds: float, epsilon: float
) -> list[list[Any]]:
    """Group gate-passing segments into time-contiguous runs.

    A run extends while each segment's ``start_time`` is within ``epsilon`` of
    the previous segment's ``end_time`` (no recording gap) and the run's total
    span stays at or below ``max_seconds``. A gap or the cap starts a new run.
    Each segment must expose ``start_time`` / ``end_time``.
    """
    runs: list[list[Any]] = []
    current: list[Any] = []
    for seg in segments:
        if not current:
            current = [seg]
            continue
        prev_end = float(current[-1].end_time)
        run_start = float(current[0].start_time)
        contiguous = abs(float(seg.start_time) - prev_end) <= epsilon
        within_cap = (float(seg.end_time) - run_start) <= max_seconds
        if contiguous and within_cap:
            current.append(seg)
        else:
            runs.append(current)
            current = [seg]
    if current:
        runs.append(current)
    return runs


def build_segment_time_map(
    run: list[Any],
) -> list[tuple[float, float, float]]:
    """Build a (stream_offset, abs_start, duration) row per segment in a run.

    ``stream_offset`` is the segment's start in continuous VOD stream time (the
    cumulative sum of preceding segment durations); ``abs_start`` is its absolute
    ``start_time``. Built from each segment's own duration; for a gap-free run
    this makes stream time equal ``run_start + offset``.
    """
    rows: list[tuple[float, float, float]] = []
    offset = 0.0
    for seg in run:
        duration = float(seg.end_time) - float(seg.start_time)
        rows.append((offset, float(seg.start_time), duration))
        offset += duration
    return rows


def stream_time_to_absolute(
    time_map: list[tuple[float, float, float]], stream_time: float
) -> float:
    """Map a VOD stream time to an absolute timestamp via the run's table.

    Binary-searches the segment whose stream range contains ``stream_time`` and
    returns ``abs_start + (stream_time - stream_offset)``. Times past the last
    segment map into the last segment (clamped at the run edge).
    """
    offsets = [row[0] for row in time_map]
    idx = bisect_right(offsets, stream_time) - 1
    if idx < 0:
        idx = 0
    stream_offset, abs_start, _duration = time_map[idx]
    return abs_start + (stream_time - stream_offset)
