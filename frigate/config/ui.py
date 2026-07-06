from enum import Enum

from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["TimeFormatEnum", "UnitSystemEnum", "UIConfig"]


class TimeFormatEnum(str, Enum):
    browser = "browser"
    hours12 = "12hour"
    hours24 = "24hour"


class UnitSystemEnum(str, Enum):
    imperial = "imperial"
    metric = "metric"


class UIConfig(FrigateBaseModel):
    timezone: str | None = Field(
        default=None,
        title="Timezone",
        description="Optional timezone to display across the UI (defaults to browser local time if unset).",
    )
    time_format: TimeFormatEnum = Field(
        default=TimeFormatEnum.browser,
        title="Time format",
        description="Time format to use in the UI (browser, 12hour, or 24hour).",
    )
    unit_system: UnitSystemEnum = Field(
        default=UnitSystemEnum.metric,
        title="Unit system",
        description="Unit system for display (metric or imperial) used in the UI and MQTT.",
    )
