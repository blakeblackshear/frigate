"""Time utilities."""

import datetime
import logging
import math
from zoneinfo import ZoneInfoNotFoundError

import pytz
from tzlocal import get_localzone

logger = logging.getLogger(__name__)


def get_tz_modifiers(tz_name: str) -> tuple[str, str, float]:
    seconds_offset = (
        datetime.datetime.now(pytz.timezone(tz_name)).utcoffset().total_seconds()
    )
    hours_offset = int(seconds_offset / 60 / 60)
    minutes_offset = int(seconds_offset / 60 - hours_offset * 60)
    hour_modifier = f"{hours_offset} hour"
    minute_modifier = f"{minutes_offset} minute"
    return hour_modifier, minute_modifier, seconds_offset


def get_tomorrow_at_time(hour: int) -> datetime.datetime:
    """Returns the datetime of the following day at 2am."""
    try:
        tomorrow = datetime.datetime.now(get_localzone()) + datetime.timedelta(days=1)
    except ZoneInfoNotFoundError:
        tomorrow = datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=1)
        logger.warning(
            "Using utc for maintenance due to missing or incorrect timezone set"
        )

    return tomorrow.replace(hour=hour, minute=0, second=0).astimezone(datetime.UTC)


def is_current_hour(timestamp: int) -> bool:
    """Returns if timestamp is in the current UTC hour."""
    start_of_next_hour = (
        datetime.datetime.now(datetime.UTC).replace(minute=0, second=0, microsecond=0)
        + datetime.timedelta(hours=1)
    ).timestamp()
    return timestamp < start_of_next_hour


def _utc_offset(tz: datetime.tzinfo, timestamp: float) -> float:
    dt = datetime.datetime.fromtimestamp(timestamp, tz=datetime.UTC)
    return dt.astimezone(tz).utcoffset().total_seconds()


def _find_transition(
    tz: datetime.tzinfo, lo: float, hi: float, lo_offset: float
) -> float:
    """Bisect (lo, hi] to the second where the UTC offset first differs from lo_offset."""
    # whole seconds, so the midpoint always advances (a fractional bound can
    # otherwise leave the midpoint sitting on lo) and lands on the transition
    low = math.floor(lo)
    high = math.ceil(hi)

    while high - low > 1:
        mid = (low + high) // 2
        if _utc_offset(tz, mid) == lo_offset:
            low = mid
        else:
            high = mid

    return float(high)


def get_dst_transitions(
    tz_name: str, start_time: float, end_time: float
) -> list[tuple[float, float, float]]:
    """
    Find DST transition points and return time periods with consistent offsets.

    Args:
        tz_name: Timezone name (e.g., 'America/New_York')
        start_time: Start timestamp (UTC)
        end_time: End timestamp (UTC)

    Returns:
        List of (period_start, period_end, seconds_offset) tuples representing
        continuous periods with the same UTC offset
    """
    try:
        tz = pytz.timezone(tz_name)
    except pytz.UnknownTimeZoneError:
        # If timezone is invalid, return single period with no offset
        return [(start_time, end_time, 0)]

    periods = []
    current = start_time
    period_start = start_time
    prev_offset = _utc_offset(tz, current)

    # Probe at most a day ahead, capped at end_time so a transition after the
    # last full day is still seen instead of silently kept in the last period.
    while current < end_time:
        next_probe = min(current + 86400, end_time)
        next_offset = _utc_offset(tz, next_probe)

        if next_offset != prev_offset:
            transition = _find_transition(tz, current, next_probe, prev_offset)
            periods.append((period_start, transition, prev_offset))
            period_start = transition
            prev_offset = _utc_offset(tz, transition)
            current = transition
        else:
            current = next_probe

    periods.append((period_start, end_time, prev_offset))

    return periods
