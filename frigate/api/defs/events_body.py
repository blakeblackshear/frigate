from typing import Union

from pydantic import BaseModel, Field


class EventsSubLabelBody(BaseModel):
    subLabel: str
    subLabelScore: float


class EventsDescriptionBody(BaseModel):
    description: Union[str, None] = Field(
        title="The description of the event", min_length=1
    )
