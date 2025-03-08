from typing import Optional

from pydantic import Field

from .base import FrigateBaseModel
from .env import EnvString

__all__ = ["ProxyConfig", "HeaderMappingConfig"]


class HeaderMappingConfig(FrigateBaseModel):
    user: str = Field(
        default=None, title="Header name from upstream proxy to identify user."
    )
    role: str = Field(
        default=None,
        title="Header name from upstream proxy to identify user role.",
    )


class ProxyConfig(FrigateBaseModel):
    header_map: HeaderMappingConfig = Field(
        default_factory=HeaderMappingConfig,
        title="Header mapping definitions for proxy user passing.",
    )
    logout_url: Optional[str] = Field(
        default=None, title="Redirect url for logging out with proxy."
    )
    auth_secret: Optional[EnvString] = Field(
        default=None,
        title="Secret value for proxy authentication.",
    )
