from typing import Optional

from pydantic import Field

from ..base import FrigateBaseModel

__all__ = ["NotificationConfig"]


class NotificationConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable notifications")
    email: Optional[str] = Field(default=None, title="Email required for push.")
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of notifications."
    )
