from datetime import datetime

from pydantic import BaseModel, Json

from frigate.api.defs.severity_enum import SeverityEnum


class ReviewSegmentResponse(BaseModel):
    id: str
    camera: str
    start_time: datetime
    end_time: datetime
    has_been_reviewed: bool
    severity: SeverityEnum
    thumb_path: str
    data: Json
