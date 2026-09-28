from typing import Literal

from pydantic import BaseModel, Field


class AccessControllerBody(BaseModel):
    id: str = Field(min_length=1, max_length=30)
    name: str | None = Field(default=None, max_length=100)
    ip_address: str = Field(min_length=1, max_length=45, pattern=r"^[^/@?#\s]+$")
    port: int = Field(default=80, ge=1, le=65535)
    provider: Literal["cgi", "netsdk"] = "cgi"
    sdk_port: int = Field(default=37777, ge=1, le=65535)
    use_https: bool = False
    event_api: Literal["eventManager", "snapManager"] = "eventManager"
    username: str | None = Field(default=None, max_length=100)
    password: str | None = Field(default=None, max_length=255)
    associated_camera: str | None = Field(default=None, max_length=100)
    seconds_before: int = Field(default=10, ge=0, le=300)
    seconds_after: int = Field(default=10, ge=0, le=300)


class AccessControllerUpdateBody(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    ip_address: str | None = Field(
        default=None, max_length=45, pattern=r"^[^/@?#\s]+$"
    )
    port: int | None = Field(default=None, ge=1, le=65535)
    provider: Literal["cgi", "netsdk"] | None = None
    sdk_port: int | None = Field(default=None, ge=1, le=65535)
    use_https: bool | None = None
    event_api: Literal["eventManager", "snapManager"] | None = None
    username: str | None = Field(default=None, max_length=100)
    password: str | None = Field(default=None, max_length=255)
    clear_credentials: bool = False
    associated_camera: str | None = Field(default=None, max_length=100)
    seconds_before: int | None = Field(default=None, ge=0, le=300)
    seconds_after: int | None = Field(default=None, ge=0, le=300)
