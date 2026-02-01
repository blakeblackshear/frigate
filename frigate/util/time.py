"""Time utilities."""

import datetime
import logging
from typing import Tuple
from zoneinfo import ZoneInfoNotFoundError

import pytz
from tzlocal import get_localzone

logger = logging.getLogger(__name__)


def get_tz_modifiers(tz_name: str) -> Tuple[str, str, float]:
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
        tomorrow = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            days=1
        )
        logger.warning(
            "Using utc for maintenance due to missing or incorrect timezone set"
        )

    return tomorrow.replace(hour=hour, minute=0, second=0).astimezone(
        datetime.timezone.utc
    )


def is_current_hour(timestamp: int) -> bool:
    """Returns if timestamp is in the current UTC hour."""
    start_of_next_hour = (
        datetime.datetime.now(datetime.timezone.utc).replace(
            minute=0, second=0, microsecond=0
        )
        + datetime.timedelta(hours=1)
    ).timestamp()
    return timestamp < start_of_next_hour


def get_dst_transitions(
    tz_name: str, start_time: float, end_time: float
) -> list[tuple[float, float]]:
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

    # Get initial offset
    dt = datetime.datetime.utcfromtimestamp(current).replace(tzinfo=pytz.UTC)
    local_dt = dt.astimezone(tz)
    prev_offset = local_dt.utcoffset().total_seconds()
    period_start = start_time

    # Check each day for offset changes
    while current <= end_time:
        dt = datetime.datetime.utcfromtimestamp(current).replace(tzinfo=pytz.UTC)
        local_dt = dt.astimezone(tz)
        current_offset = local_dt.utcoffset().total_seconds()

        if current_offset != prev_offset:
            # Found a transition - close previous period
            periods.append((period_start, current, prev_offset))
            period_start = current
            prev_offset = current_offset

        current += 86400  # Check daily

    # Add final period
    periods.append((period_start, end_time, prev_offset))

    return periods
