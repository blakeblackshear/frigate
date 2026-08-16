"""Merge main and sub stream recording rows into a unified coverage timeline."""

import logging
from dataclasses import dataclass
from typing import Any

from frigate.const import MAX_SEGMENT_DURATION, STREAM_TYPE_MAIN, STREAM_TYPE_SUB
from frigate.models import Recordings

logger = logging.getLogger(__name__)

# intervals shorter than this are boundary artifacts, not playable content
MIN_INTERVAL_S = 0.1


@dataclass
class CoverageInterval:
    """A time span annotated with the recording row covering it per stream."""

    start_time: float
    end_time: float
    main: Any | None
    sub: Any | None


def _rows_query(camera: str, after: float, before: float, stream_type: str) -> Any:
    return (
        Recordings.select(
            Recordings.path,
            Recordings.start_time,
            Recordings.end_time,
            Recordings.duration,
            Recordings.has_audio,
            Recordings.audio_rate,
            Recordings.audio_codec,
            Recordings.video_codec,
            Recordings.segment_size,
            Recordings.keyframes,
        )
        .where(
            (Recordings.camera == camera)
            & (Recordings.stream_type == stream_type)
            & (Recordings.end_time > after)
            & (Recordings.start_time < before)
            & (Recordings.start_time > after - MAX_SEGMENT_DURATION)
        )
        .order_by(Recordings.start_time.asc())
        .namedtuples()
    )


def _get_rows(camera: str, after: float, before: float, stream_type: str) -> list[Any]:
    return list(_rows_query(camera, after, before, stream_type))


def _covering(
    rows: list[Any], idx: int, start: float, end: float
) -> tuple[Any | None, int]:
    """Find the row covering [start, end), advancing idx (rows are sorted, non-overlapping)."""
    while idx < len(rows) and rows[idx].end_time <= start:
        idx += 1
    if idx < len(rows) and rows[idx].start_time <= start and rows[idx].end_time >= end:
        return rows[idx], idx
    return None, idx


def resolve_coverage(
    camera: str, after: float, before: float
) -> list[CoverageInterval]:
    """Resolve the unified coverage timeline for a camera and time range.

    Returns intervals bounded by the union of both streams' segment edges,
    clamped to [after, before]. Ranges covered by neither stream produce no
    interval (a gap).
    """
    main_rows = _get_rows(camera, after, before, STREAM_TYPE_MAIN)
    sub_rows = _get_rows(camera, after, before, STREAM_TYPE_SUB)

    boundaries: set[float] = set()
    for row in main_rows + sub_rows:
        boundaries.add(max(row.start_time, after))
        boundaries.add(min(row.end_time, before))

    ordered = sorted(boundaries)
    intervals: list[CoverageInterval] = []
    main_idx = 0
    sub_idx = 0

    for i in range(len(ordered) - 1):
        start, end = ordered[i], ordered[i + 1]

        if end - start < MIN_INTERVAL_S:
            continue

        main_row, main_idx = _covering(main_rows, main_idx, start, end)
        sub_row, sub_idx = _covering(sub_rows, sub_idx, start, end)

        if main_row is None and sub_row is None:
            continue

        intervals.append(CoverageInterval(start, end, main_row, sub_row))

    return intervals


def known_video_codecs(intervals: list[CoverageInterval]) -> set[str]:
    """Collect the known video codecs across all rows in a coverage window.

    NULL codecs (legacy rows probed before the column existed) are
    excluded, so uniformly-unknown data reports an empty set.
    """
    return {
        row.video_codec
        for interval in intervals
        for row in (interval.main, interval.sub)
        if row is not None and row.video_codec is not None
    }


def stream_media_summary(
    intervals: list[CoverageInterval],
) -> dict[str, dict[str, Any]]:
    """Summarize the most recently known media details per stream.

    Every field reports the newest non-NULL value across that stream's
    rows, so an older row can still supply a value a legacy newer row
    lacks. A stream with no rows is omitted entirely.
    """
    fields = ("video_codec", "audio_rate", "audio_codec", "has_audio")
    summary: dict[str, dict[str, Any]] = {}

    for stream_type in (STREAM_TYPE_MAIN, STREAM_TYPE_SUB):
        # the same row can back many intervals, so dedupe by path
        rows = {
            row.path: row
            for interval in intervals
            if (row := getattr(interval, stream_type)) is not None
        }

        if not rows:
            continue

        newest_first = sorted(rows.values(), key=lambda r: r.start_time, reverse=True)
        stream_summary: dict[str, Any] = {field: None for field in fields}

        for field in fields:
            for row in newest_first:
                value = getattr(row, field)
                if value is not None:
                    stream_summary[field] = value
                    break

        # segment_size is stored in MiB; totalling bytes and seconds
        # weights by duration, unlike averaging per-row ratios
        total_bytes = 0.0
        total_seconds = 0.0
        for row in rows.values():
            size = row.segment_size
            if size is None or size <= 0 or row.duration is None or row.duration <= 0:
                continue
            total_bytes += size * 1024 * 1024
            total_seconds += row.duration

        stream_summary["bitrate"] = (
            int(total_bytes * 8 / total_seconds) if total_seconds > 0 else None
        )

        summary[stream_type] = stream_summary

    return summary


def coverage_spans(intervals: list[CoverageInterval]) -> list[dict[str, Any]]:
    """Collapse intervals into contiguous spans of identical stream availability."""
    spans: list[dict[str, Any]] = []

    for interval in intervals:
        streams = [
            t
            for t, row in (
                (STREAM_TYPE_MAIN, interval.main),
                (STREAM_TYPE_SUB, interval.sub),
            )
            if row is not None
        ]
        if (
            spans
            and spans[-1]["end_time"] == interval.start_time
            and spans[-1]["streams"] == streams
        ):
            spans[-1]["end_time"] = interval.end_time
        else:
            spans.append(
                {
                    "start_time": interval.start_time,
                    "end_time": interval.end_time,
                    "streams": streams,
                }
            )

    return spans


def stream_has_audio(intervals: list[CoverageInterval], main: bool) -> bool:
    """Whether a stream is audio-bearing over a coverage window.

    A stream counts as audio-bearing unless EVERY one of its rows reports
    has_audio False; NULL (legacy or undetermined) counts as audio.
    """
    return any(
        row is not None and row.has_audio is not False
        for row in ((interval.main if main else interval.sub) for interval in intervals)
    )


def null_audio_glitches(
    intervals: list[CoverageInterval], main_audio: bool, sub_audio: bool
) -> list[CoverageInterval]:
    """Treat video-only glitch rows on audio-bearing streams as no recording.

    nginx-vod requires every clip in a sequence to carry the same track
    count, so a truncated video-only segment (a backend restart can flush
    a sub-second file before any audio packet landed) poisons every
    manifest that includes it. Nulling the row turns the glitch into a
    hole the span builder skips like any recording gap.
    """
    result: list[CoverageInterval] = []
    for interval in intervals:
        main = interval.main
        sub = interval.sub
        if main is not None and main_audio and main.has_audio is False:
            main = None
        if sub is not None and sub_audio and sub.has_audio is False:
            sub = None
        if main is None and sub is None:
            continue
        if main is interval.main and sub is interval.sub:
            result.append(interval)
        else:
            result.append(
                CoverageInterval(interval.start_time, interval.end_time, main, sub)
            )
    return result


def build_spans(
    intervals: list[CoverageInterval], stream: str | None
) -> list[list[Any]]:
    """Merge coverage intervals into single-sequence spans of one row each.

    Each span is [row, start, end, is_main]; is_main lets the manifest
    builder detect cross-stream hand-offs. A pinned stream serves only
    its own rows; otherwise main is preferred and sub fills the gaps.
    Intervals served by the same row merge on row identity alone, since
    splitting a row mid-file would re-snap to a keyframe and repeat
    content.
    """
    spans: list[list[Any]] = []
    last_is_main: bool | None = None
    for interval in intervals:
        if stream == STREAM_TYPE_MAIN:
            row, is_main = interval.main, True
        elif stream == STREAM_TYPE_SUB:
            row, is_main = interval.sub, False
        elif interval.main is not None:
            row, is_main = interval.main, True
        else:
            row, is_main = interval.sub, False
        if row is None:
            continue
        if spans and spans[-1][0] == row:
            spans[-1][2] = interval.end_time
        else:
            start = interval.start_time
            # adjacent same-stream rows routinely overlap; trimming the
            # previous span's end is free, where starting this span
            # mid-file would cost a clipFrom keyframe snap. Inclusive on
            # the span end, since sub-MIN_INTERVAL_S overlaps are dropped
            # by the resolver and leave the previous span ending a hair
            # past this row's start
            if (
                spans
                and is_main == last_is_main
                and spans[-1][1] < row.start_time <= spans[-1][2]
            ):
                spans[-1][2] = row.start_time
                start = row.start_time
            spans.append([row, start, interval.end_time, is_main])
        last_is_main = is_main
    return spans


def _keyframe_before(keyframes: Any, offset_ms: int) -> int | None:
    """Last stored keyframe offset at or before offset_ms.

    keyframes is the row's record-time keyframe index (ms from segment
    start). Returns None when the row has no usable index, which callers
    treat as "serve the whole file".
    """
    if not keyframes:
        return None

    candidates = [k for k in keyframes if k <= offset_ms]
    return max(candidates) if candidates else None


@dataclass
class ClipPlan:
    """The exact playlist realization of one span.

    clip_from_ms is the keyframe-snapped clipFrom, or None when the whole
    file is served. skipped means the clip is omitted from the manifest.
    """

    clip_from_ms: int | None
    duration_ms: int
    skipped: bool


def plan_clip(row: Any, start: float, end: float) -> ClipPlan:
    """Plan one nginx-vod clip for a recording row trimmed to [start, end).

    The single source of truth for clip realization: the vod mapping
    builder emits exactly this plan and the coverage timelines report it
    to the frontend, so the playhead model matches the playlist by
    construction rather than accumulating drift at each hand-off.
    """
    min_duration_ms = 100  # Minimum 100ms to ensure at least one video frame
    max_duration_ms = MAX_SEGMENT_DURATION * 1000

    clip_from: int | None = None
    duration = int(row.duration * 1000)

    # adjust start offset if start is after the recording start
    inpoint = int((start - row.start_time) * 1000) if start > row.start_time else 0
    if inpoint > 0:
        clip_from = inpoint
        duration -= inpoint

    # adjust end if the recording ends after the requested end
    if row.end_time > end:
        duration -= int((row.end_time - end) * 1000)

    # nginx-vod-module pushes clipFrom forward to the next keyframe,
    # which can leave too few frames for a playable segment; snapping
    # back to the preceding keyframe always starts on a decodable frame
    if clip_from is not None:
        keyframe_ms = _keyframe_before(row.keyframes, clip_from)
        if keyframe_ms is not None:
            gained = clip_from - keyframe_ms
            clip_from = keyframe_ms
            duration += gained
            logger.debug(
                "VOD: snapped clipFrom to keyframe at %sms for %s, duration now %sms",
                keyframe_ms,
                row.path,
                duration,
            )
        else:
            logger.debug(
                "VOD: no keyframe index for %s, removing clipFrom to use full recording",
                row.path,
            )
            clip_from = None
            duration = int(row.duration * 1000)
            if row.end_time > end:
                duration -= int((row.end_time - end) * 1000)

    if duration < min_duration_ms:
        logger.debug(
            "VOD: skipping recording %s - resulting duration %sms too short",
            row.path,
            duration,
        )
        return ClipPlan(None, 0, True)

    if duration >= max_duration_ms:
        logger.warning(f"Recording clip is missing or empty: {row.path}")
        return ClipPlan(None, 0, True)

    return ClipPlan(clip_from, duration, False)


def realized_timeline(
    intervals: list[CoverageInterval], stream: str | None
) -> list[dict[str, Any]]:
    """The exact playlist timeline a vod route will realize for a range.

    Each item pairs a span's wall-clock bounds with the duration (ms) of
    the manifest clip serving it, including keyframe back-snap lead-in,
    so summing durations reproduces playlist time exactly. A span whose
    clip is skipped reports duration 0.
    """
    return [
        {
            "start_time": span_start,
            "end_time": span_end,
            "duration": plan.duration_ms,
        }
        for row, span_start, span_end, _ in build_spans(intervals, stream)
        for plan in (plan_clip(row, span_start, span_end),)
    ]


def realized_timelines(
    intervals: list[CoverageInterval],
) -> dict[str, list[dict[str, Any]]]:
    """All three variant timelines for a coverage window.

    Applies the same glitch-nulling as the manifest builder, then
    assembles each variant's realized spans. Keyframe snapping reads the
    per-row index stored at record time, so no file is touched.
    """
    main_audio = stream_has_audio(intervals, main=True)
    sub_audio = stream_has_audio(intervals, main=False)
    nulled = null_audio_glitches(intervals, main_audio, sub_audio)

    return {
        "auto": realized_timeline(nulled, None),
        "main": realized_timeline(nulled, STREAM_TYPE_MAIN),
        "sub": realized_timeline(nulled, STREAM_TYPE_SUB),
    }
