from typing import Optional

from pydantic import Field, ValidationInfo, model_validator
from typing_extensions import Self

from frigate.const import FREQUENCY_STATS_POINTS

from .base import FrigateBaseModel
from .env import EnvString

__all__ = ["MqttConfig"]


class MqttConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="Enable MQTT Communication.")
    host: str = Field(default="", title="MQTT Host")
    port: int = Field(default=1883, title="MQTT Port")
    topic_prefix: str = Field(default="frigate", title="MQTT Topic Prefix")
    client_id: str = Field(default="frigate", title="MQTT Client ID")
    stats_interval: int = Field(
        default=60, ge=FREQUENCY_STATS_POINTS, title="MQTT Camera Stats Interval"
    )
    user: Optional[EnvString] = Field(default=None, title="MQTT Username")
    password: Optional[EnvString] = Field(
        default=None, title="MQTT Password", validate_default=True
    )
    tls_ca_certs: Optional[str] = Field(default=None, title="MQTT TLS CA Certificates")
    tls_client_cert: Optional[str] = Field(
        default=None, title="MQTT TLS Client Certificate"
    )
    tls_client_key: Optional[str] = Field(default=None, title="MQTT TLS Client Key")
    tls_insecure: Optional[bool] = Field(default=None, title="MQTT TLS Insecure")
    qos: int = Field(default=0, title="MQTT QoS")

    @model_validator(mode="after")
    def user_requires_pass(self, info: ValidationInfo) -> Self:
        if (self.user is None) != (self.password is None):
            raise ValueError("Password must be provided with username.")
        return self
