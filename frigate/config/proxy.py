from typing import Optional

from pydantic import Field, field_validator

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
    role_map: Optional[dict[str, list[str]]] = Field(
        default_factory=dict,
        title=("Mapping of Frigate roles to upstream group values. "),
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
    default_role: Optional[str] = Field(
        default="viewer", title="Default role for proxy users."
    )
    separator: Optional[str] = Field(
        default=",",
        title="The character used to separate values in a mapped header.",
    )

    @field_validator("separator", mode="before")
    @classmethod
    def validate_separator_length(cls, v):
        if v is not None and len(v) != 1:
            raise ValueError("Separator must be exactly one character")
        return v
