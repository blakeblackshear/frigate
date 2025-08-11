from pydantic import BaseModel, Field


class ReviewMetadata(BaseModel):
    scene: str = Field(
        description="A comprehensive description of the setting and entities, including relevant context and plausible inferences if supported by visual evidence."
    )
    confidence: float = Field(
        description="A float between 0 and 1 representing your overall confidence in this analysis."
    )
    potential_threat_level: int = Field(
        ge=0,
        le=3,
        description="An integer representing the potential threat level (1-3). 1: Minor anomaly. 2: Moderate concern. 3: High threat. Only include this field if a clear security concern is observable; otherwise, omit it.",
    )
    other_concerns: list[str] | None = Field(
        default=None,
        description="Other concerns highlighted by the user that are observed.",
    )
