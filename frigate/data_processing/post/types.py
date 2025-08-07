from pydantic import BaseModel, Field


class ReviewMetadata(BaseModel):
    scene: str = Field(
        description="A concise summary of the overall scene. This should be a single string of text."
    )
    action: str = Field(
        description="A concise description of the primary action or event happening in the scene. This should be a single string of text."
    )
    potential_threat_level: int | None = Field(
        default=None,
        ge=0,
        le=3,
        description="An integer representing the potential threat level (0-3). 0: No threat. 1: Minor anomaly. 2: Moderate concern. 3: High threat. Only include this field if a clear security concern is observable; otherwise, omit it.",
    )
