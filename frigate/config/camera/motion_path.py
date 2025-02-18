from typing import Any, Optional

from pydantic import Field, field_serializer, validator

from ..base import FrigateBaseModel

__all__ = ["MotionPathConfig"]


class MotionPathConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="Enable motion path tracking.")
    max_history: int = Field(
        default=10,
        title="Number of positions to maintain in motion path history.",
        ge=2,
        le=100,
    )
    mask: Optional[Any] = Field(default=None)
    raw_mask: Optional[Any] = Field(default=None)

    @field_serializer("mask", when_used="json")
    def serialize_mask(self, value: Any, info):
        return self.raw_mask

    @field_serializer("raw_mask", when_used="json")
    def serialize_raw_mask(self, value: Any, info):
        return None

    @validator("max_history")
    def max_history_range(cls, v):
        if v < 2:
            raise ValueError("max_history must be >= 2")
        if v > 100:
            raise ValueError("max_history must be <= 100")
        return v
