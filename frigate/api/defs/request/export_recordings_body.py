from typing import Optional, Union

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from frigate.record.export import PlaybackSourceEnum


class ExportRecordingsBody(BaseModel):
    source: PlaybackSourceEnum = Field(
        default=PlaybackSourceEnum.recordings, title="Playback source"
    )
    name: Optional[str] = Field(title="Friendly name", default=None, max_length=256)
    image_path: Union[str, SkipJsonSchema[None]] = None
    export_case_id: Optional[str] = Field(
        default=None,
        title="Export case ID",
        max_length=30,
        description="ID of the export case to assign this export to",
    )


class ExportRecordingsCustomBody(BaseModel):
    source: PlaybackSourceEnum = Field(
        default=PlaybackSourceEnum.recordings, title="Playback source"
    )
    name: str = Field(title="Friendly name", default=None, max_length=256)
    image_path: Union[str, SkipJsonSchema[None]] = None
    export_case_id: Optional[str] = Field(
        default=None,
        title="Export case ID",
        max_length=30,
        description="ID of the export case to assign this export to",
    )
    ffmpeg_input_args: Optional[str] = Field(
        default=None,
        title="FFmpeg input arguments",
        description="Custom FFmpeg input arguments. If not provided, defaults to timelapse input args.",
    )
    ffmpeg_output_args: Optional[str] = Field(
        default=None,
        title="FFmpeg output arguments",
        description="Custom FFmpeg output arguments. If not provided, defaults to timelapse output args.",
    )
    cpu_fallback: bool = Field(
        default=False,
        title="CPU Fallback",
        description="If true, retry export without hardware acceleration if the initial export fails.",
    )
