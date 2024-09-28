from enum import Enum
from typing import Optional

from pydantic import Field

from ..base import FrigateBaseModel

__all__ = [
    "TimestampStyleConfig",
    "TimestampEffectEnum",
    "ColorConfig",
    "TimestampPositionEnum",
]


# TODO: Identify what the default format to display timestamps is
DEFAULT_TIME_FORMAT = "%m/%d/%Y %H:%M:%S"
# German Style:
# DEFAULT_TIME_FORMAT = "%d.%m.%Y %H:%M:%S"


class TimestampPositionEnum(str, Enum):
    tl = "tl"
    tr = "tr"
    bl = "bl"
    br = "br"


class ColorConfig(FrigateBaseModel):
    red: int = Field(default=255, ge=0, le=255, title="Red")
    green: int = Field(default=255, ge=0, le=255, title="Green")
    blue: int = Field(default=255, ge=0, le=255, title="Blue")


class TimestampEffectEnum(str, Enum):
    solid = "solid"
    shadow = "shadow"


class TimestampStyleConfig(FrigateBaseModel):
    position: TimestampPositionEnum = Field(
        default=TimestampPositionEnum.tl, title="Timestamp position."
    )
    format: str = Field(default=DEFAULT_TIME_FORMAT, title="Timestamp format.")
    color: ColorConfig = Field(default_factory=ColorConfig, title="Timestamp color.")
    thickness: int = Field(default=2, title="Timestamp thickness.")
    effect: Optional[TimestampEffectEnum] = Field(
        default=None, title="Timestamp effect."
    )
