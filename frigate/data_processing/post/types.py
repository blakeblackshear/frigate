from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

ObservationItem = Annotated[str, StringConstraints(min_length=20, max_length=160)]


class ReviewMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore", protected_namespaces=())

    observations: list[ObservationItem] = Field(
        ...,
        min_length=3,
        max_length=15,
        description=(
            "Enumerate the significant observations across all frames, in "
            "chronological order, BEFORE composing the scene narrative. "
            "Include the very start of the activity — for example, a vehicle "
            "entering the frame or pulling into the driveway — even if it "
            "lasts only a few frames and the rest of the clip is dominated "
            "by a longer activity. Include each arrival, departure, motion "
            "event, object handled, and notable change in position or state. "
            "Each item is a single concrete fact written as a complete "
            "sentence. Do not summarize, interpret, or assign meaning here — "
            "that belongs in the scene field."
        ),
    )
    title: str = Field(
        max_length=80,
        description="A short title characterizing what took place and where, under 10 words.",
    )
    scene: str = Field(
        min_length=150,
        max_length=400,
        description="A chronological narrative of what happens from start to finish, drawing directly from the items in observations.",
    )
    shortSummary: str = Field(
        min_length=70,
        max_length=100,
        description="A brief 2-sentence summary of the scene, suitable for notifications.",
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
