from typing import Any

from pydantic import Field, field_validator

from frigate.util.env import EnvString

from ..base import FrigateBaseModel

__all__ = ["NotificationConfig"]

VALID_NOTIFY_ON_STATES = {"start", "end", "genai"}


class NotificationConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable notifications",
        description="Enable or disable notifications for all cameras; can be overridden per-camera.",
    )
    email: EnvString | None = Field(
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
    notify_on: list[str] = Field(
        default_factory=lambda: ["start", "genai"],
        title="Notification triggers",
        description="List of review event states that trigger notifications ('start', 'end', 'genai'). Set to ['genai'] to receive smart notifications only after GenAI analysis.",
    )
    min_threat_level: int | None = Field(
        default=None,
        ge=0,
        le=2,
        title="Minimum threat level",
        description="Minimum potential threat level (0=normal, 1=suspicious, 2=critical) required to send a notification. If set, notifications for review events with a lower threat level will be suppressed.",
    )
    enabled_in_config: bool | None = Field(
        default=None,
        title="Original notifications state",
        description="Indicates whether notifications were enabled in the original static configuration.",
    )

    @field_validator("notify_on", mode="before")
    @classmethod
    def validate_notify_on(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            v = [item.strip() for item in v.split(",") if item.strip()]
        if not isinstance(v, list):
            raise ValueError("notify_on must be a list of strings")
        invalid = [item for item in v if item not in VALID_NOTIFY_ON_STATES]
        if invalid:
            raise ValueError(
                f"Invalid notify_on trigger(s): {', '.join(invalid)}. "
                f"Allowed values are: {', '.join(sorted(VALID_NOTIFY_ON_STATES))}"
            )
        return v
