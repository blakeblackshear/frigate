from pydantic import Field, field_validator, model_validator

from .base import FrigateBaseModel
from .env import EnvString

__all__ = ["AuthConfig", "OidcConfig"]


class OidcConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable OpenID Connect",
        description="Enable Single Sign-On via an OpenID Connect identity provider.",
    )
    issuer: str | None = Field(
        default=None,
        title="Issuer URL",
        description=(
            "Issuer URL of the OIDC provider. Frigate will fetch discovery metadata "
            "from '{issuer}/.well-known/openid-configuration'."
        ),
    )
    client_id: EnvString | None = Field(
        default=None,
        title="Client ID",
        description="OIDC client identifier issued by the provider.",
    )
    client_secret: EnvString | None = Field(
        default=None,
        title="Client secret",
        description="OIDC client secret issued by the provider.",
    )
    redirect_uri: str | None = Field(
        default=None,
        title="Redirect URI override",
        description=(
            "Optional absolute URL for the OIDC callback. When unset it is derived "
            "from the incoming request as '{scheme}://{host}/api/oidc/callback'."
        ),
    )
    scopes: list[str] = Field(
        default_factory=lambda: ["openid", "email", "profile", "groups"],
        title="Requested scopes",
        description="Scopes requested from the OIDC provider.",
    )
    username_claim: str = Field(
        default="preferred_username",
        title="Username claim",
        description=(
            "ID token claim that supplies the Frigate username. Falls back to 'email' "
            "and then 'sub' when the configured claim is missing."
        ),
    )
    groups_claim: str = Field(
        default="groups",
        title="Groups claim",
        description="ID token claim (list or delimited string) that supplies the user's groups.",
    )
    group_map: dict[str, list[str]] = Field(
        default_factory=dict,
        title="Group to role mapping",
        description=(
            "Map Frigate roles to lists of provider group values. When a user's "
            "groups claim matches any entry the corresponding role is granted. The "
            "admin role is prioritized to avoid accidental downgrade."
        ),
    )
    default_role: str | None = Field(
        default="viewer",
        title="Default role",
        description="Role assigned when no group_map entry matches. Must be a configured role.",
    )
    auto_provision: bool = Field(
        default=True,
        title="Auto-provision users",
        description=(
            "Create or update the Frigate user row on successful OIDC login. When "
            "disabled a matching user must already exist in the database."
        ),
    )
    end_session_endpoint: str | None = Field(
        default=None,
        title="End-session endpoint override",
        description=(
            "Optional URL to redirect to on logout. When unset Frigate uses the "
            "'end_session_endpoint' advertised by discovery, when available."
        ),
    )
    allowed_group_separators: str = Field(
        default=",",
        title="Group value separator",
        description=(
            "When the groups claim is a string instead of a list it is split on any "
            "character in this string."
        ),
    )


class AuthConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=True,
        title="Enable authentication",
        description="Enable native authentication for the Frigate UI.",
    )
    reset_admin_password: bool = Field(
        default=False,
        title="Reset admin password",
        description="If true, reset the admin user's password on startup and print the new password in logs.",
    )
    cookie_name: str = Field(
        default="frigate_token",
        title="JWT cookie name",
        description="Name of the cookie used to store the JWT token for native authentication.",
        pattern=r"^[a-z_]+$",
    )
    cookie_secure: bool = Field(
        default=False,
        title="Secure cookie flag",
        description="Set the secure flag on the auth cookie; should be true when using TLS.",
    )
    session_length: int = Field(
        default=86400,
        title="Session length",
        description="Session duration in seconds for JWT-based sessions.",
        ge=60,
    )
    refresh_time: int = Field(
        default=1800,
        title="Session refresh window",
        description="When a session is within this many seconds of expiring, refresh it back to full length.",
        ge=30,
    )
    failed_login_rate_limit: str | None = Field(
        default=None,
        title="Failed login limits",
        description="Rate limiting rules for failed login attempts to reduce brute-force attacks.",
    )
    trusted_proxies: list[str] = Field(
        default=[],
        title="Trusted proxies",
        description="List of trusted proxy IPs used when determining client IP for rate limiting.",
    )
    # As of Feb 2023, OWASP recommends 600000 iterations for PBKDF2-SHA256
    hash_iterations: int = Field(
        default=600000,
        title="Hash iterations",
        description="Number of PBKDF2-SHA256 iterations to use when hashing user passwords.",
    )
    roles: dict[str, list[str]] = Field(
        default_factory=dict,
        title="Role mappings",
        description="Map roles to camera lists. An empty list grants access to all cameras for the role.",
    )
    admin_first_time_login: bool | None = Field(
        default=False,
        title="First-time admin flag",
        description=(
            "When true the UI may show a help link on the login page informing users how to sign in after an admin password reset. "
        ),
    )
    oidc: OidcConfig = Field(
        default_factory=OidcConfig,
        title="OpenID Connect",
        description="Configuration for Single Sign-On via an OIDC provider.",
    )

    @field_validator("roles")
    @classmethod
    def validate_roles(cls, v: dict[str, list[str]]) -> dict[str, list[str]]:
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

    @model_validator(mode="after")
    def validate_oidc(self):
        oidc = self.oidc
        if not oidc.enabled:
            return self

        missing = [
            name
            for name, value in (
                ("issuer", oidc.issuer),
                ("client_id", oidc.client_id),
                ("client_secret", oidc.client_secret),
            )
            if not value
        ]
        if missing:
            raise ValueError(
                f"OIDC is enabled but the following auth.oidc fields are missing: {', '.join(missing)}"
            )

        valid_roles = set(self.roles.keys()) | {"admin", "viewer"}
        for role in oidc.group_map.keys():
            if role not in valid_roles:
                raise ValueError(
                    f"auth.oidc.group_map role '{role}' is not a configured role. Known roles: {sorted(valid_roles)}"
                )

        if oidc.default_role is not None and oidc.default_role not in valid_roles:
            raise ValueError(
                f"auth.oidc.default_role '{oidc.default_role}' is not a configured role. Known roles: {sorted(valid_roles)}"
            )

        return self
