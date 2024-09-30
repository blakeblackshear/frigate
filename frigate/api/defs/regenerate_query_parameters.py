from typing import Optional

from pydantic import BaseModel


class RegenerateQueryParameters(BaseModel):
    source: Optional[str] = "thumbnails"
