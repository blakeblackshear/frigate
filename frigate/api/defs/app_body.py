from pydantic import BaseModel


class AppConfigSetBody(BaseModel):
    requires_restart: int = 1
