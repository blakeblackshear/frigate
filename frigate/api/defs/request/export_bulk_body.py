"""Request bodies for bulk export operations."""

from typing import Optional

from pydantic import BaseModel, Field, conlist, constr


class ExportBulkDeleteBody(BaseModel):
    """Request body for bulk deleting exports."""

    # List of export IDs with at least one element and each element with at least one char
    ids: conlist(constr(min_length=1), min_length=1)


class ExportBulkReassignBody(BaseModel):
    """Request body for bulk reassigning exports to a case."""

    # List of export IDs with at least one element and each element with at least one char
    ids: conlist(constr(min_length=1), min_length=1)
    export_case_id: Optional[str] = Field(
        default=None,
        max_length=30,
        description="Case ID to assign to, or null to unassign from current case",
    )
