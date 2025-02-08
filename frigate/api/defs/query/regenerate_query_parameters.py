from typing import Optional

from pydantic import BaseModel

from frigate.events.types import RegenerateDescriptionEnum


class RegenerateQueryParameters(BaseModel):
    source: Optional[RegenerateDescriptionEnum] = RegenerateDescriptionEnum.thumbnails
