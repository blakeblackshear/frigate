from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AppConfigSetBody(BaseModel):
    requires_restart: int = 1
    update_topic: str | None = None
    config_data: Optional[Dict[str, Any]] = None


class AppPutPasswordBody(BaseModel):
    password: str
    old_password: Optional[str] = None


class AppPostUsersBody(BaseModel):
    username: str
    password: str
    role: Optional[str] = "viewer"


class AppPostLoginBody(BaseModel):
    user: str
    password: str


class AppPutRoleBody(BaseModel):
    role: str


class MediaSyncBody(BaseModel):
    dry_run: bool = Field(
        default=True, description="If True, only report orphans without deleting them"
    )
    media_types: List[str] = Field(
        default=["all"],
        description="Types of media to sync: 'all', 'event_snapshots', 'event_thumbnails', 'review_thumbnails', 'previews', 'exports', 'recordings'",
    )
    force: bool = Field(
        default=False, description="If True, bypass safety threshold checks"
    )
