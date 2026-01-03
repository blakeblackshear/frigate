from typing import Optional

from pydantic import BaseModel


class RecordingsDeleteQueryParams(BaseModel):
    keep: Optional[str] = None
    cameras: Optional[str] = "all"
