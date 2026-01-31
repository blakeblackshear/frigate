from typing import Optional

from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["NotificationConfig"]


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
