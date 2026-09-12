from pydantic import BaseModel, Field


class ExportCaseCreateBody(BaseModel):
    """Request body for creating a new export case."""

    name: str = Field(max_length=100, description="Friendly name of the export case")
    description: str | None = Field(
        default=None, description="Optional description of the export case"
    )


class ExportCaseUpdateBody(BaseModel):
    """Request body for updating an existing export case."""

    name: str | None = Field(
        default=None,
        max_length=100,
        description="Updated friendly name of the export case",
    )
    description: str | None = Field(
        default=None, description="Updated description of the export case"
    )
