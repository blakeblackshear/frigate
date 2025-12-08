from typing import Dict, List, Optional

from pydantic import Field, field_validator, model_validator

from .base import FrigateBaseModel

__all__ = ["AuthConfig"]


class AuthConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="Enable authentication")
    reset_admin_password: bool = Field(
        default=False, title="Reset the admin password on startup"
    )
    cookie_name: str = Field(
        default="frigate_token", title="Name for jwt token cookie", pattern=r"^[a-z_]+$"
    )
    cookie_secure: bool = Field(default=False, title="Set secure flag on cookie")
    session_length: int = Field(
        default=86400, title="Session length for jwt session tokens", ge=60
    )
    refresh_time: int = Field(
        default=1800,
        title="Refresh the session if it is going to expire in this many seconds",
        ge=30,
    )
    failed_login_rate_limit: Optional[str] = Field(
        default=None,
        title="Rate limits for failed login attempts.",
    )
    trusted_proxies: list[str] = Field(
        default=[],
        title="Trusted proxies for determining IP address to rate limit",
    )
    # As of Feb 2023, OWASP recommends 600000 iterations for PBKDF2-SHA256
    hash_iterations: int = Field(default=600000, title="Password hash iterations")
    roles: Dict[str, List[str]] = Field(
        default_factory=dict,
        title="Role to camera mappings. Empty list grants access to all cameras.",
    )
    admin_first_time_login: Optional[bool] = Field(
        default=False,
        title="Internal field to expose first-time admin login flag to the UI",
        description=(
            "When true the UI may show a help link on the login page informing users how to sign in after an admin password reset. "
        ),
    )

    @field_validator("roles")
    @classmethod
    def validate_roles(cls, v: Dict[str, List[str]]) -> Dict[str, List[str]]:
        # Ensure role names are valid (alphanumeric with underscores)
        for role in v.keys():
            if not role.replace("_", "").isalnum():
                raise ValueError(
                    f"Invalid role name '{role}'. Must be alphanumeric with underscores."
                )

        # Ensure 'admin' and 'viewer' are not used as custom role names
        reserved_roles = {"admin", "viewer"}
        if v.keys() & reserved_roles:
            raise ValueError(
                f"Reserved roles {reserved_roles} cannot be used as custom roles."
            )

        # Ensure no role has an empty camera list
        for role, allowed_cameras in v.items():
            if not allowed_cameras:
                raise ValueError(
                    f"Role '{role}' has no cameras assigned. Custom roles must have at least one camera."
                )

        return v

    @model_validator(mode="after")
    def ensure_default_roles(self):
        # Ensure admin and viewer are never overridden
        self.roles["admin"] = []
        self.roles["viewer"] = []

        return self
