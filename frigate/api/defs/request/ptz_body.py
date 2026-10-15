from pydantic import BaseModel, Field


class PtzPresetCreateBody(BaseModel):
    name: str = Field(title="Preset name", min_length=1, max_length=64)


class PtzPresetUpdateBody(BaseModel):
    name: str | None = Field(
        default=None,
        title="New preset name, or None to keep the current name",
        min_length=1,
        max_length=64,
    )
