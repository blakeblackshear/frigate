from pydantic import BaseModel, Field, model_validator

MAX_BATCH_EXPORT_ITEMS = 50


class BatchExportItem(BaseModel):
    camera: str = Field(title="Camera name")
    start_time: float = Field(title="Start time")
    end_time: float = Field(title="End time")
    image_path: str | None = Field(
        default=None,
        title="Existing thumbnail path",
        description="Optional existing image to use as the export thumbnail",
    )
    friendly_name: str | None = Field(
        default=None,
        title="Friendly name",
        max_length=256,
        description="Optional friendly name for this specific export item",
    )
    client_item_id: str | None = Field(
        default=None,
        title="Client item ID",
        max_length=128,
        description="Optional opaque client identifier echoed back in results",
    )


class BatchExportBody(BaseModel):
    items: list[BatchExportItem] = Field(
        title="Items",
        min_length=1,
        max_length=MAX_BATCH_EXPORT_ITEMS,
        description="List of export items. Each item has its own camera and time range.",
    )
    export_case_id: str | None = Field(
        default=None,
        title="Export case ID",
        max_length=30,
        description=(
            "Existing export case ID to assign all exports to. Attaching to an "
            "existing case is temporarily admin-only until case-level ACLs exist."
        ),
    )
    new_case_name: str | None = Field(
        default=None,
        title="New case name",
        max_length=100,
        description="Name of a new export case to create when export_case_id is omitted",
    )
    new_case_description: str | None = Field(
        default=None,
        title="New case description",
        description="Optional description for a newly created export case",
    )

    @model_validator(mode="after")
    def validate_case_target(self) -> "BatchExportBody":
        for item in self.items:
            if item.end_time <= item.start_time:
                raise ValueError("end_time must be after start_time")

        return self
