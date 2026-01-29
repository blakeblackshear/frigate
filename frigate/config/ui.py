from enum import Enum
from typing import Optional

from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["TimeFormatEnum", "DateTimeStyleEnum", "UnitSystemEnum", "UIConfig"]


class TimeFormatEnum(str, Enum):
    browser = "browser"
    hours12 = "12hour"
    hours24 = "24hour"


class DateTimeStyleEnum(str, Enum):
    full = "full"
    long = "long"
    medium = "medium"
    short = "short"


class UnitSystemEnum(str, Enum):
    imperial = "imperial"
    metric = "metric"


class UIConfig(FrigateBaseModel):
    timezone: Optional[str] = Field(
        default=None,
        title="Override UI timezone",
        description="Optional timezone to display across the UI (defaults to browser local time if unset).",
    )
    time_format: TimeFormatEnum = Field(
        default=TimeFormatEnum.browser,
        title="Override UI time format",
        description="Time format to use in the UI (browser, 12hour, or 24hour).",
    )
    date_style: DateTimeStyleEnum = Field(
        default=DateTimeStyleEnum.short,
        title="Override UI dateStyle",
        description="Date style to use in the UI (full, long, medium, short).",
    )
    time_style: DateTimeStyleEnum = Field(
        default=DateTimeStyleEnum.medium,
        title="Override UI timeStyle",
        description="Time style to use in the UI (full, long, medium, short).",
    )
    unit_system: UnitSystemEnum = Field(
        default=UnitSystemEnum.metric,
        title="The unit system to use for measurements",
        description="Unit system for display (metric or imperial) used in the UI and MQTT.",
    )
