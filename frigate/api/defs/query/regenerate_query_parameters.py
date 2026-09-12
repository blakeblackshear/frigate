from pydantic import BaseModel, Field

from frigate.events.types import RegenerateDescriptionEnum


class RegenerateQueryParameters(BaseModel):
    source: RegenerateDescriptionEnum | None = RegenerateDescriptionEnum.thumbnails
    force: bool | None = Field(
        default=False,
        description="Force (re)generating the description even if GenAI is disabled for this camera.",
    )
