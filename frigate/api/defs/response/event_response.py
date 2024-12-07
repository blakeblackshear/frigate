from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class EventResponse(BaseModel):
    id: str
    label: str
    sub_label: Optional[str]
    camera: str
    start_time: float
    end_time: Optional[float]
    false_positive: Optional[bool]
    zones: list[str]
    thumbnail: str
    has_clip: bool
    has_snapshot: bool
    retain_indefinitely: bool
    plus_id: Optional[str]
    model_hash: Optional[str]
    detector_type: Optional[str]
    model_type: Optional[str]
    data: dict[str, Any]

    model_config = ConfigDict(protected_namespaces=())


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
