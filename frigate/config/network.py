from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["IPv6Config", "NetworkingConfig"]


class IPv6Config(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable IPv6 for port 5000 and/or 8971")


class NetworkingConfig(FrigateBaseModel):
    ipv6: IPv6Config = Field(default_factory=IPv6Config, title="Network configuration")
