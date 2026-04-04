import re
from typing import Optional

from pydantic import Field, field_validator

from ..base import FrigateBaseModel

__all__ = ["NotificationConfig"]

DURATION_PATTERN = re.compile(r"^(\d+)\s*([mhdw])$")
UNIT_TO_MINUTES = {"m": 1, "h": 60, "d": 1440, "w": 10080}

DEFAULT_SUSPEND_DURATIONS = ["5m", "10m", "30m", "1h", "12h", "24h", "until_restart"]


def parse_duration_to_minutes(value: str) -> int:
    """Parse a duration string like '5m', '24h' into total minutes."""
    match = DURATION_PATTERN.match(value.strip().lower())
    if not match:
        raise ValueError(
            f"Invalid duration format: '{value}'. Use number + unit (m/h/d/w), e.g. '5m', '24h', '7d'."
        )
    count = int(match.group(1))
    unit = match.group(2)
    if count <= 0:
        raise ValueError(f"Duration must be positive: '{value}'")
    return count * UNIT_TO_MINUTES[unit]


class NotificationConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable notifications",
        description="Enable or disable notifications for all cameras; can be overridden per-camera.",
    )
    email: Optional[str] = Field(
        default=None,
        title="Notification email",
        description="Email address used for push notifications or required by certain notification providers.",
    )
    cooldown: int = Field(
        default=0,
        ge=0,
        title="Cooldown period",
        description="Cooldown (seconds) between notifications to avoid spamming recipients.",
    )
    enabled_in_config: Optional[bool] = Field(
        default=None,
        title="Original notifications state",
        description="Indicates whether notifications were enabled in the original static configuration.",
    )
    suspend_durations: list[str] = Field(
        default=DEFAULT_SUSPEND_DURATIONS,
        title="Suspend duration options",
        description="List of duration options for the notification suspend dropdown. Use format: number + unit (m/h/d/w). Special value 'until_restart' suspends until Frigate restarts.",
    )

    @field_validator("suspend_durations")
    @classmethod
    def validate_suspend_durations(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("suspend_durations must not be empty")
        for entry in v:
            if entry == "until_restart":
                continue
            parse_duration_to_minutes(entry)
        # Sort by duration, with "until_restart" always last
        return sorted(
            v,
            key=lambda x: (
                float("inf") if x == "until_restart" else parse_duration_to_minutes(x)
            ),
        )
