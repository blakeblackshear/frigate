from typing import Optional, Union

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from frigate.record.export import (
    PlaybackFactorEnum,
    PlaybackSourceEnum,
)


class ExportRecordingsBody(BaseModel):
    playback: PlaybackFactorEnum = Field(
        default=PlaybackFactorEnum.realtime, title="Playback factor"
    )
    source: PlaybackSourceEnum = Field(
        default=PlaybackSourceEnum.recordings, title="Playback source"
    )
    name: Optional[str] = Field(title="Friendly name", default=None, max_length=256)
    image_path: Union[str, SkipJsonSchema[None]] = None
