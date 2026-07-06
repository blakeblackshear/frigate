from pydantic import BaseModel, Field

from frigate.config.classification import TriggerType


class EventsSubLabelBody(BaseModel):
    subLabel: str = Field(title="Sub label", max_length=100)
    subLabelScore: float | None = Field(
        title="Score for sub label", default=None, gt=0.0, le=1.0
    )
    camera: str | None = Field(title="Camera this object is detected on.", default=None)


class EventsLPRBody(BaseModel):
    recognizedLicensePlate: str = Field(
        title="Recognized License Plate", max_length=100
    )
    recognizedLicensePlateScore: float | None = Field(
        title="Score for recognized license plate", default=None, gt=0.0, le=1.0
    )


class EventsAttributesBody(BaseModel):
    attributes: list[str] = Field(
        title="Selected classification attributes for the event",
        default_factory=list,
    )


class EventsDescriptionBody(BaseModel):
    description: str | None = Field(title="The description of the event")


class EventsCreateBody(BaseModel):
    sub_label: str | None = None
    score: float | None = 0
    duration: int | None = 30
    include_recording: bool | None = True
    draw: dict | None = {}
    pre_capture: int | None = None


class EventsEndBody(BaseModel):
    end_time: float | None = None


class EventsDeleteBody(BaseModel):
    event_ids: list[str] = Field(title="The event IDs to delete")


class SubmitPlusBody(BaseModel):
    include_annotation: int = Field(default=1)


class TriggerEmbeddingBody(BaseModel):
    type: TriggerType
    data: str
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)
