from typing import Optional

from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["NotificationConfig"]


class NotificationConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable notifications")
    email: Optional[str] = Field(default=None, title="Email required for push.")
    cooldown: int = Field(
        default=0, ge=0, title="Cooldown period for notifications (time in seconds)."
    )
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of notifications."
    )
