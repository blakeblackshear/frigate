from typing import Union

from pydantic import BaseModel, Field
from pydantic.json_schema import SkipJsonSchema

from frigate.record.export import PlaybackFactorEnum


class ExportRecordingsBody(BaseModel):
    playback: PlaybackFactorEnum = Field(
        default=PlaybackFactorEnum.realtime, title="Playback factor"
    )
    source: str = "recordings"
    name: str = Field(title="Friendly name", min_length=1, max_length=256)
    image_path: Union[str, SkipJsonSchema[None]] = None
