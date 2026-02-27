from typing import Any, Dict, Optional

from pydantic import BaseModel


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
