from typing import Optional

from pydantic import BaseModel, Field

from frigate.events.types import RegenerateDescriptionEnum


class RegenerateQueryParameters(BaseModel):
    source: Optional[RegenerateDescriptionEnum] = RegenerateDescriptionEnum.thumbnails
    force: Optional[bool] = Field(
        default=False,
        description="Force (re)generating the description even if GenAI is disabled for this camera.",
    )
