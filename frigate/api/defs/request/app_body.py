from typing import Optional

from pydantic import BaseModel


class AppConfigSetBody(BaseModel):
    requires_restart: int = 1


class AppPutPasswordBody(BaseModel):
    password: str


class AppPostUsersBody(BaseModel):
    username: str
    password: str
    role: Optional[str] = "viewer"


class AppPostLoginBody(BaseModel):
    user: str
    password: str


class AppPutRoleBody(BaseModel):
    role: str
