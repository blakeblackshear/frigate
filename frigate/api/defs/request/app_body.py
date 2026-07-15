from typing import Any

from pydantic import BaseModel, Field

from frigate.config import GenAIProviderEnum


class AppConfigSetBody(BaseModel):
    requires_restart: int = 1
    update_topic: str | None = None
    config_data: dict[str, Any] | None = None
    skip_save: bool = False


class GenAIProbeBody(BaseModel):
    provider: GenAIProviderEnum
    api_key: str | None = None
    base_url: str | None = None
    provider_options: dict[str, Any] = Field(default_factory=dict)


class AppPutPasswordBody(BaseModel):
    password: str
    old_password: str | None = None


class AppPostUsersBody(BaseModel):
    username: str
    password: str
    role: str | None = "viewer"


class AppPostLoginBody(BaseModel):
    user: str
    password: str


class AppPutRoleBody(BaseModel):
    role: str


class CameraSetBody(BaseModel):
    value: str = Field(..., description="The value to set for the feature")


class MediaSyncBody(BaseModel):
    dry_run: bool = Field(
        default=True, description="If True, only report orphans without deleting them"
    )
    media_types: list[str] = Field(
        default=["all"],
        description="Types of media to sync: 'all', 'event_snapshots', 'event_thumbnails', 'review_thumbnails', 'previews', 'exports', 'recordings'",
    )
    force: bool = Field(
        default=False, description="If True, bypass safety threshold checks"
    )
    verbose: bool = Field(
        default=False,
        description="If True, write full orphan file list to disk",
    )
