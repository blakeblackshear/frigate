"""Frame annotations derived from object tracking data.

Builds short notes describing what changed during a review item, keyed to the
frames sampled from it. Everything here comes from tracked object data already
in the database, chiefly each event's `path_data` trajectory, so the notes can
be stated to the model as fact rather than as something it must perceive.
"""

import logging
from typing import Any

from frigate.models import Event

logger = logging.getLogger(__name__)

# Movement smaller than this (normalized frame units) between two path points
# is treated as the object holding still rather than travelling.
STILL_THRESHOLD = 0.02

# A heading change beyond this (dot product against the leg's own heading)
# counts as the object turning back rather than curving.
REVERSAL_DOT = -0.3

# A run of travel shorter than this (normalized frame units) is treated as
# milling about rather than going somewhere. Without it, a subject pacing in
# one spot produces a burst of contradictory "turns around" notes on a single
# frame.
MIN_LEG_DISTANCE = 0.08


def describe_position(x: float, y: float) -> str:
    """Name a normalized frame position in plain terms."""
    horizontal = "left" if x < 0.34 else ("right" if x > 0.66 else "center")
    vertical = "top" if y < 0.34 else ("bottom" if y > 0.66 else "middle")

    if horizontal == "center" and vertical == "middle":
        return "the middle of the frame"

    if horizontal == "center":
        return f"the {vertical} of the frame"

    if vertical == "middle":
        return f"the {horizontal} of the frame"

    return f"the {vertical} {horizontal} of the frame"


def describe_heading(dx: float, dy: float) -> str:
    """Name a direction of travel in frame terms.

    y grows downward in normalized coordinates, so a falling y reads as moving
    toward the top of the frame.
    """
    parts = []

    if abs(dy) > abs(dx) * 0.4:
        parts.append("down" if dy > 0 else "up")

    if abs(dx) > abs(dy) * 0.4:
        parts.append("right" if dx > 0 else "left")

    return " and ".join(parts) if parts else "in place"


def event_name(event: dict[str, Any]) -> str:
    """Name an object for the notes, e.g. 'a person' or 'waste bin "Compost"'.

    Objects are never numbered or given track identifiers. Frigate opens a new
    tracked object whenever a subject is re-detected, so the tracking data
    cannot say whether two entries are the same subject, and the notes stay
    ambiguous rather than implying either answer.
    """
    label = str(event["label"]).replace("_", " ").replace("-verified", "")
    sub_label = event.get("sub_label")

    if sub_label:
        return f'{label} "{sub_label}"'

    article = "an" if label[:1].lower() in "aeiou" else "a"
    return f"{article} {label}"


def path_legs(points: list[tuple[float, float, float]]) -> list[tuple[int, int]]:
    """Split a trajectory into runs of travel in a consistent direction.

    A leg ends when the subject starts moving back against the direction that
    leg established, and only once the leg has covered MIN_LEG_DISTANCE, so
    jitter around a standing subject does not register as a turn.

    Returns (start, end) index pairs into `points`.
    """
    legs: list[tuple[int, int]] = []
    start = 0

    for i in range(1, len(points)):
        lx = points[i][0] - points[start][0]
        ly = points[i][1] - points[start][1]
        leg_distance = (lx * lx + ly * ly) ** 0.5

        if leg_distance < MIN_LEG_DISTANCE:
            continue

        sx = points[i][0] - points[i - 1][0]
        sy = points[i][1] - points[i - 1][1]
        step = (sx * sx + sy * sy) ** 0.5

        if step < STILL_THRESHOLD:
            continue

        dot = (lx / leg_distance) * (sx / step) + (ly / leg_distance) * (sy / step)

        if dot < REVERSAL_DOT:
            legs.append((start, i - 1))
            start = i - 1

    if start < len(points) - 1:
        legs.append((start, len(points) - 1))

    return [
        (a, b)
        for a, b in legs
        if ((points[b][0] - points[a][0]) ** 2 + (points[b][1] - points[a][1]) ** 2)
        ** 0.5
        >= MIN_LEG_DISTANCE
    ]


def path_moments(path_data: list[Any]) -> list[tuple[float, str]]:
    """Key moments in one trajectory as (timestamp, phrase).

    Emits one note per leg of travel plus where the last leg ends.
    """
    if not path_data or len(path_data) < 2:
        return []

    try:
        points = [(p[0][0], p[0][1], p[1]) for p in path_data]
    except (IndexError, TypeError):
        logger.debug("Malformed path_data, skipping trajectory notes")
        return []

    legs = path_legs(points)
    moments: list[tuple[float, str]] = []

    for index, (a, b) in enumerate(legs):
        x0, y0, t0 = points[a]
        x1, y1, _ = points[b]
        heading = describe_heading(x1 - x0, y1 - y0)

        if index == 0:
            moments.append(
                (t0, f"starts moving {heading} from {describe_position(x0, y0)}")
            )
        else:
            moments.append(
                (t0, f"turns around at {describe_position(x0, y0)} and heads {heading}")
            )

    if legs:
        # path_data only records significant movement, so its last point marks
        # where travel was last seen, not that the object came to rest there.
        x, y, t = points[legs[-1][1]]
        moments.append((t, f"reaches {describe_position(x, y)}"))

    return moments


def build_timeline(
    events: list[dict[str, Any]], span_end: float
) -> list[tuple[float, str]]:
    """All annotated moments across every event, in time order.

    `span_end` is the timestamp of the last sampled frame. Moments past it
    describe nothing the model can see. Notes only state what the tracker
    knows: a track ending means the object stopped being detected, which may
    or may not mean it left the frame.
    """
    ordered = sorted(events, key=lambda e: e["start_time"])
    timeline: list[tuple[float, str]] = []

    for event in ordered:
        name = event_name(event)
        path = event.get("path_data") or []
        where = describe_position(path[0][0][0], path[0][0][1]) if path else "the frame"
        timeline.append((event["start_time"], f"{name} first detected at {where}"))

        for timestamp, phrase in path_moments(path):
            if timestamp > span_end:
                continue

            timeline.append((timestamp, f"{name} {phrase}"))

        if event["end_time"] and event["end_time"] <= span_end:
            timeline.append((event["end_time"], f"{name} is no longer detected"))
        else:
            timeline.append(
                (span_end, f"{name} is still being tracked at the end of the clip")
            )

    return sorted(timeline, key=lambda m: m[0])


def annotations_by_frame(
    timeline: list[tuple[float, str]], frame_times: list[float]
) -> dict[int, list[str]]:
    """Bucket timeline moments onto the frame that follows each one.

    A moment is attached to the first frame at or after it happened, so the
    note always precedes the image in which the change becomes visible.
    """
    buckets: dict[int, list[str]] = {}

    if not frame_times:
        return buckets

    for timestamp, phrase in timeline:
        index = next(
            (i for i, ft in enumerate(frame_times) if ft >= timestamp),
            len(frame_times) - 1,
        )
        buckets.setdefault(index, []).append(phrase)

    return buckets


def get_tracked_events(detection_ids: list[str]) -> list[dict[str, Any]]:
    """Load the tracked objects behind a review item's detections."""
    if not detection_ids:
        return []

    rows = list(
        Event.select(
            Event.id,
            Event.label,
            Event.sub_label,
            Event.start_time,
            Event.end_time,
            Event.zones,
            Event.data,
        )
        .where(Event.id << detection_ids)
        .dicts()
        .iterator()
    )

    return [
        {
            "id": row["id"],
            "label": row["label"],
            "sub_label": row["sub_label"],
            "start_time": row["start_time"],
            "end_time": row["end_time"],
            "zones": row["zones"] or [],
            "path_data": (row["data"] or {}).get("path_data") or [],
        }
        for row in rows
        if row["start_time"] is not None
    ]


def build_frame_captions(
    detection_ids: list[str], frame_times: list[float]
) -> list[str]:
    """A caption for each sampled frame, in frame order.

    Every frame gets its index and elapsed time so the model can tell them
    apart; frames where something changed also carry the tracker notes for
    that moment. Returns an empty list when there is nothing to say, which
    callers treat as a reason to fall back to sending plain frames.
    """
    if not frame_times:
        return []

    events = get_tracked_events(detection_ids)

    if not events:
        logger.debug("No tracked events found for review item, skipping annotations")
        return []

    buckets = annotations_by_frame(build_timeline(events, frame_times[-1]), frame_times)

    if not buckets:
        return []

    total = len(frame_times)
    origin = frame_times[0]
    captions: list[str] = []

    for index, timestamp in enumerate(frame_times):
        lines = [f"Frame {index + 1} of {total} (+{timestamp - origin:.1f}s):"]
        lines.extend(f"[tracker] {note}" for note in buckets.get(index, []))
        captions.append("\n".join(lines))

    return captions
