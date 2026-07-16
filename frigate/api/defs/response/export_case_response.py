from pydantic import BaseModel, Field


class ExportCaseModel(BaseModel):
    """Model representing a single export case."""

    id: str = Field(description="Unique identifier for the export case")
    name: str = Field(description="Friendly name of the export case")
    description: str | None = Field(
        default=None, description="Optional description of the export case"
    )
    created_at: float = Field(
        description="Unix timestamp when the export case was created"
    )
    updated_at: float = Field(
        description="Unix timestamp when the export case was last updated"
    )


ExportCasesResponse = list[ExportCaseModel]
