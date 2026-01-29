from typing import Optional

from pydantic import Field, field_validator

from .base import FrigateBaseModel
from .env import EnvString

__all__ = ["ProxyConfig", "HeaderMappingConfig"]


class HeaderMappingConfig(FrigateBaseModel):
    user: str = Field(
        default=None,
        title="User header",
        description="Header containing the authenticated username provided by the upstream proxy.",
    )
    role: str = Field(
        default=None,
        title="Role header",
        description="Header containing the authenticated user's role or groups from the upstream proxy.",
    )
    role_map: Optional[dict[str, list[str]]] = Field(
        default_factory=dict,
        title=("Role mapping"),
        description="Map upstream group values to Frigate roles (for example map admin groups to the admin role).",
    )


class ProxyConfig(FrigateBaseModel):
    header_map: HeaderMappingConfig = Field(
        default_factory=HeaderMappingConfig,
        title="Header mapping",
        description="Map incoming proxy headers to Frigate user and role fields for proxy-based auth.",
    )
    logout_url: Optional[str] = Field(
        default=None,
        title="Logout URL",
        description="URL to redirect users to when logging out via the proxy.",
    )
    auth_secret: Optional[EnvString] = Field(
        default=None,
        title="Proxy secret",
        description="Optional secret checked against the X-Proxy-Secret header to verify trusted proxies.",
    )
    default_role: Optional[str] = Field(
        default="viewer",
        title="Default role",
        description="Default role assigned to proxy-authenticated users when no role mapping applies (admin or viewer).",
    )
    separator: Optional[str] = Field(
        default=",",
        title="Separator character",
        description="Character used to split multiple values provided in proxy headers.",
    )

    @field_validator("separator", mode="before")
    @classmethod
    def validate_separator_length(cls, v):
        if v is not None and len(v) != 1:
            raise ValueError("Separator must be exactly one character")
        return v
