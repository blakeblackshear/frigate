from enum import Enum

from pydantic import Field

from frigate.util.env import EnvString

from ..base import FrigateBaseModel

__all__ = ["NotificationConfig", "NotificationTTLEnum", "NOTIFICATION_TTL_SECONDS"]


class NotificationTTLEnum(str, Enum):
    immediate = "immediate"
    reliable = "reliable"


NOTIFICATION_TTL_SECONDS = {
    NotificationTTLEnum.immediate: 0,
    NotificationTTLEnum.reliable: 30,
}


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
    ttl: NotificationTTLEnum = Field(
        default=NotificationTTLEnum.immediate,
        title="Notification TTL",
        description="How the push service handles a notification sent while an alert is active if your device can't be reached. Immediate delivers it right away or drops it. Reliable keeps retrying for up to 30 seconds. The notification sent when an alert ends is always kept for up to an hour.",
    )
    enabled_in_config: bool | None = Field(
        default=None,
        title="Original notifications state",
        description="Indicates whether notifications were enabled in the original static configuration.",
    )
