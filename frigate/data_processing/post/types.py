from pydantic import BaseModel, ConfigDict, Field


class ReviewMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore", protected_namespaces=())

    title: str = Field(description="A concise title for the activity.")
    scene: str = Field(
        description="A comprehensive description of the setting and entities, including relevant context and plausible inferences if supported by visual evidence."
    )
    shortSummary: str = Field(
        description="A brief 2-sentence summary of the scene, suitable for notifications. Should capture the key activity and context without full detail."
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
    time: str | None = Field(default=None, description="Time of activity.")
