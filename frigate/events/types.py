"""Types for event management."""

from enum import Enum


class EventTypeEnum(str, Enum):
    api = "api"
    tracked_object = "tracked_object"


class EventStateEnum(str, Enum):
    start = "start"
    update = "update"
    end = "end"
