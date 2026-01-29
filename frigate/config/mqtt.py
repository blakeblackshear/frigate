from typing import Optional

from pydantic import Field, ValidationInfo, model_validator
from typing_extensions import Self

from frigate.const import FREQUENCY_STATS_POINTS

from .base import FrigateBaseModel
from .env import EnvString

__all__ = ["MqttConfig"]


class MqttConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=True,
        title="Enable MQTT",
        description="Enable or disable MQTT integration for state, events, and snapshots.",
    )
    host: str = Field(
        default="",
        title="MQTT host",
        description="Hostname or IP address of the MQTT broker.",
    )
    port: int = Field(
        default=1883,
        title="MQTT port",
        description="Port of the MQTT broker (usually 1883 for plain MQTT).",
    )
    topic_prefix: str = Field(
        default="frigate",
        title="Topic prefix",
        description="MQTT topic prefix for all Frigate topics; must be unique if running multiple instances.",
    )
    client_id: str = Field(
        default="frigate",
        title="Client ID",
        description="Client identifier used when connecting to the MQTT broker; should be unique per instance.",
    )
    stats_interval: int = Field(
        default=60,
        ge=FREQUENCY_STATS_POINTS,
        title="Stats interval",
        description="Interval in seconds for publishing system and camera stats to MQTT.",
    )
    user: Optional[EnvString] = Field(
        default=None,
        title="MQTT username",
        description="Optional MQTT username; can be provided via environment variables or secrets.",
    )
    password: Optional[EnvString] = Field(
        default=None,
        title="MQTT password",
        description="Optional MQTT password; can be provided via environment variables or secrets.",
        validate_default=True,
    )
    tls_ca_certs: Optional[str] = Field(
        default=None,
        title="TLS CA certs",
        description="Path to CA certificate for TLS connections to the broker (for self-signed certs).",
    )
    tls_client_cert: Optional[str] = Field(
        default=None,
        title="Client cert",
        description="Client certificate path for TLS mutual authentication; do not set user/password when using client certs.",
    )
    tls_client_key: Optional[str] = Field(
        default=None,
        title="Client key",
        description="Private key path for the client certificate.",
    )
    tls_insecure: Optional[bool] = Field(
        default=None,
        title="TLS insecure",
        description="Allow insecure TLS connections by skipping hostname verification (not recommended).",
    )
    qos: int = Field(
        default=0,
        title="MQTT QoS",
        description="Quality of Service level for MQTT publishes/subscriptions (0, 1, or 2).",
    )

    @model_validator(mode="after")
    def user_requires_pass(self, info: ValidationInfo) -> Self:
        if (self.user is None) != (self.password is None):
            raise ValueError("Password must be provided with username.")
        return self
