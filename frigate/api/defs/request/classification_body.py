from pydantic import BaseModel


class RenameFaceBody(BaseModel):
    new_name: str
