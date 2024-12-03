from pydantic import BaseModel


class EventCreateResponse(BaseModel):
    success: bool
    message: str
    event_id: str


class EventMultiDeleteResponse(BaseModel):
    success: bool
    deleted_events: list[str]
    not_found_events: list[str]


class EventUploadPlusResponse(BaseModel):
    success: bool
    plus_id: str
