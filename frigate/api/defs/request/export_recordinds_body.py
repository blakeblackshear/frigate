from typing import Optional

from pydantic import BaseModel, Field

from frigate.record.export import PlaybackFactorEnum


class ExportRecordingsBody(BaseModel):
    playback: PlaybackFactorEnum = Field(
        default=PlaybackFactorEnum.realtime, title="Playback factor"
    )
    source: str = "recordings"
    name: str = Field(title="Friendly name", min_length=1, max_length=256)
    image_path: Optional[str] = None
