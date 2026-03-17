"""Configuration for the VOD transcode proxy (optional playback transcoding)."""
from pydantic import Field

from .base import FrigateBaseModel

__all__ = ["TranscodeProxyConfig"]


class TranscodeProxyConfig(FrigateBaseModel):
    """Settings for the optional transcode proxy used for recording playback."""

    enabled: bool = Field(
        default=False,
        title="Transcode proxy enabled",
        description="When enabled, the UI uses the transcode proxy URL for VOD playback so recordings are transcoded to H.264 on the fly (e.g. for HEVC compatibility or lower bitrate).",
    )
    vod_proxy_url: str = Field(
        default="",
        title="VOD proxy base URL",
        description="Base URL for the transcode proxy (e.g. http://host:5010). When enabled, recording playback requests go to this URL + /vod/... Leave empty if the proxy is mounted at the same host (e.g. /vod-transcoded/ under the same origin).",
    )
