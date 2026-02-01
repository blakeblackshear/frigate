from typing import List, Optional, Union

from pydantic import BaseModel, Field

from frigate.config.classification import TriggerType


class EventsSubLabelBody(BaseModel):
    subLabel: str = Field(title="Sub label", max_length=100)
    subLabelScore: Optional[float] = Field(
        title="Score for sub label", default=None, gt=0.0, le=1.0
    )
    camera: Optional[str] = Field(
        title="Camera this object is detected on.", default=None
    )


class EventsLPRBody(BaseModel):
    recognizedLicensePlate: str = Field(
        title="Recognized License Plate", max_length=100
    )
    recognizedLicensePlateScore: Optional[float] = Field(
        title="Score for recognized license plate", default=None, gt=0.0, le=1.0
    )


class EventsAttributesBody(BaseModel):
    attributes: List[str] = Field(
        title="Selected classification attributes for the event",
        default_factory=list,
    )


class EventsDescriptionBody(BaseModel):
    description: Union[str, None] = Field(title="The description of the event")


class EventsCreateBody(BaseModel):
    sub_label: Optional[str] = None
    score: Optional[float] = 0
    duration: Optional[int] = 30
    include_recording: Optional[bool] = True
    draw: Optional[dict] = {}


class EventsEndBody(BaseModel):
    end_time: Optional[float] = None


class EventsDeleteBody(BaseModel):
    event_ids: List[str] = Field(title="The event IDs to delete")


class SubmitPlusBody(BaseModel):
    include_annotation: int = Field(default=1)


class TriggerEmbeddingBody(BaseModel):
    type: TriggerType
    data: str
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)
