from typing import Optional, Union

from pydantic import BaseModel, Field


class EventsSubLabelBody(BaseModel):
    subLabel: str = Field(title="Sub label", max_length=100)
    subLabelScore: Optional[float] = Field(
        title="Score for sub label", default=None, gt=0.0, le=1.0
    )


class EventsDescriptionBody(BaseModel):
    description: Union[str, None] = Field(title="The description of the event")


class EventsCreateBody(BaseModel):
    source_type: Optional[str] = "api"
    sub_label: Optional[str] = None
    score: Optional[int] = 0
    duration: Optional[int] = 30
    include_recording: Optional[bool] = True
    draw: Optional[dict] = {}


class EventsEndBody(BaseModel):
    end_time: Optional[int] = None


class SubmitPlusBody(BaseModel):
    include_annotation: int = Field(default=1)
