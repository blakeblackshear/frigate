from pydantic import BaseModel, ConfigDict, Field


class ReviewMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore", protected_namespaces=())

    observations: list[str] = Field(
        default_factory=list,
        description="Chronological list of significant observations from the frames, written before the scene narrative is composed.",
    )
    title: str = Field(
        description="A short title characterizing what took place and where, under 10 words."
    )
    scene: str = Field(
        description="A chronological narrative of what happens from start to finish.",
    )
    shortSummary: str = Field(
        description="A brief 2-sentence summary of the scene, suitable for notifications."
    )
    confidence: float = Field(
        ge=0.0,
        description="Confidence in the analysis, from 0 to 1.",
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
