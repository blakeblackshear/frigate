from typing import Optional

from pydantic import BaseModel, Field


class ExportCaseCreateBody(BaseModel):
    """Request body for creating a new export case."""

    name: str = Field(max_length=100, description="Friendly name of the export case")
    description: Optional[str] = Field(
        default=None, description="Optional description of the export case"
    )


class ExportCaseUpdateBody(BaseModel):
    """Request body for updating an existing export case."""

    name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Updated friendly name of the export case",
    )
    description: Optional[str] = Field(
        default=None, description="Updated description of the export case"
    )


class ExportCaseAssignBody(BaseModel):
    """Request body for assigning or unassigning an export to a case."""

    export_case_id: Optional[str] = Field(
        default=None,
        max_length=30,
        description="Case ID to assign to the export, or null to unassign",
    )
