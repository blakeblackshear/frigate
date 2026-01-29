from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["TlsConfig"]


class TlsConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=True,
        title="Enable TLS for port 8971",
        description="Enable TLS for Frigate's web UI and API on the configured TLS port.",
    )
