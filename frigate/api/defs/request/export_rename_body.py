from pydantic import BaseModel, Field


class ExportRenameBody(BaseModel):
    name: str = Field(title="Friendly name", max_length=256)
