from enum import Enum
from typing import Optional

from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["TimeFormatEnum", "DateTimeStyleEnum", "UIConfig"]


class TimeFormatEnum(str, Enum):
    browser = "browser"
    hours12 = "12hour"
    hours24 = "24hour"


class DateTimeStyleEnum(str, Enum):
    full = "full"
    long = "long"
    medium = "medium"
    short = "short"


class UIConfig(FrigateBaseModel):
    timezone: Optional[str] = Field(default=None, title="Override UI timezone.")
    time_format: TimeFormatEnum = Field(
        default=TimeFormatEnum.browser, title="Override UI time format."
    )
    date_style: DateTimeStyleEnum = Field(
        default=DateTimeStyleEnum.short, title="Override UI dateStyle."
    )
    time_style: DateTimeStyleEnum = Field(
        default=DateTimeStyleEnum.medium, title="Override UI timeStyle."
    )
    strftime_fmt: Optional[str] = Field(
        default=None, title="Override date and time format using strftime syntax."
    )
