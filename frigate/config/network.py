from pydantic import Field, field_validator, model_validator

from frigate.util.config import parse_listen_address

from .base import FrigateBaseModel

__all__ = ["IPv6Config", "ListenConfig", "NetworkingConfig"]


class IPv6Config(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable IPv6",
        description="Enable IPv6 support for Frigate services (API and UI) where applicable.",
    )


class ListenConfig(FrigateBaseModel):
    internal: int | str = Field(
        default=5000,
        title="Internal port",
        description="Internal listening port for Frigate (default 5000).",
    )
    external: int | str = Field(
        default=8971,
        title="External port",
        description="External listening port for Frigate (default 8971).",
    )

    # Runs before pydantic coerces a bool to an int port, which
    # get_nginx_settings.py rejects when it reads the raw YAML
    @field_validator("internal", "external", mode="before")
    @classmethod
    def validate_listen(cls, value: int | str) -> int | str:
        return parse_listen_address(value)[0]

    @property
    def internal_port(self) -> int:
        return parse_listen_address(self.internal)[1]

    @property
    def external_port(self) -> int:
        return parse_listen_address(self.external)[1]

    @model_validator(mode="after")
    def validate_distinct_ports(self) -> "ListenConfig":
        if self.internal_port == self.external_port:
            raise ValueError("internal and external must listen on different ports")

        return self


class NetworkingConfig(FrigateBaseModel):
    ipv6: IPv6Config = Field(
        default_factory=IPv6Config,
        title="IPv6 configuration",
        description="IPv6-specific settings for Frigate network services.",
    )
    listen: ListenConfig = Field(
        default_factory=ListenConfig,
        title="Listening ports configuration",
        description="Configuration for internal and external listening ports. This is for advanced users. For the majority of use cases it's recommended to change the ports section of your Docker compose file.",
    )
