from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

ObservationItem = Annotated[str, StringConstraints(min_length=20, max_length=200)]


class ReviewMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore", protected_namespaces=())

    observations: list[ObservationItem] = Field(
        ...,
        min_length=3,
        max_length=8,
        description="Enumerate the significant observations across all frames, in chronological order.",
    )
    scene: str = Field(
        min_length=150,
        max_length=600,
        description="A chronological narrative of what happens from start to finish, drawing directly from the items in observations.",
    )
    title: str = Field(
        max_length=80,
        description="Title for the activity.",
    )
    shortSummary: str = Field(
        min_length=70,
        max_length=140,
        description="A brief summary for the activity.",
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence in the analysis as a decimal between 0.0 and 1.0, where 0.0 means no confidence and 1.0 means complete confidence. Express ONLY as a decimal.",
    )
    potential_threat_level: int = Field(
        ge=0,
        le=2,
        description="Threat level: 0 = normal, 1 = suspicious, 2 = critical threat.",
    )
    other_concerns: list[str] | None = Field(
        default=None,
        description="Other concerns highlighted by the user that are observed.",
    )
    time: str | None = Field(default=None, description="Time of activity.")
