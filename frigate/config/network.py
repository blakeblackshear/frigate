from typing import Union

from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["IPv6Config", "ListenConfig", "NetworkingConfig"]


class IPv6Config(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable IPv6 for port 5000 and/or 8971")


class ListenConfig(FrigateBaseModel):
    internal: Union[int, str] = Field(
        default=5000, title="Internal listening port for Frigate"
    )
    external: Union[int, str] = Field(
        default=8971, title="External listening port for Frigate"
    )


class NetworkingConfig(FrigateBaseModel):
    ipv6: IPv6Config = Field(default_factory=IPv6Config, title="IPv6 configuration")
    listen: ListenConfig = Field(
        default_factory=ListenConfig, title="Listening ports configuration"
    )
