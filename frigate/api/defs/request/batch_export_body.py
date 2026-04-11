from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class BatchExportBody(BaseModel):
    start_time: float = Field(title="Start time")
    end_time: float = Field(title="End time")
    camera_ids: List[str] = Field(title="Camera IDs", min_length=1)
    name: Optional[str] = Field(
        default=None,
        title="Friendly name template",
        max_length=256,
        description="Base export name. Each export is saved as '<name> - <camera>'",
    )
    export_case_id: Optional[str] = Field(
        default=None,
        title="Export case ID",
        max_length=30,
        description="Existing export case ID to assign all exports to",
    )
    new_case_name: Optional[str] = Field(
        default=None,
        title="New case name",
        max_length=100,
        description="Name of a new export case to create when export_case_id is omitted",
    )
    new_case_description: Optional[str] = Field(
        default=None,
        title="New case description",
        description="Optional description for a newly created export case",
    )

    @model_validator(mode="after")
    def validate_case_target(self) -> "BatchExportBody":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")

        if self.export_case_id is None and self.new_case_name is None:
            raise ValueError("Either export_case_id or new_case_name must be provided")

        return self
