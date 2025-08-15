from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["IPv6Config"]


class IPv6Config(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable IPv6 for port 5000 and /or 8971")