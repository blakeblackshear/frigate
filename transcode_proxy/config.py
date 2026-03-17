"""Configuration from environment."""
import os
from dataclasses import dataclass, field


@dataclass
class Config:
    """Proxy configuration."""

    # Upstream Frigate VOD base URL (e.g. http://nginx:80 or http://127.0.0.1:5001)
    upstream_base: str = field(
        default_factory=lambda: os.environ.get("TRANSCODE_PROXY_UPSTREAM", "http://127.0.0.1:80")
    )
    # Optional path prefix the proxy is mounted at (e.g. /vod-transcoded); strip when forwarding
    path_prefix: str = field(
        default_factory=lambda: os.environ.get("TRANSCODE_PROXY_PATH_PREFIX", "").rstrip("/")
    )
    # Host/port to bind
    host: str = field(default_factory=lambda: os.environ.get("TRANSCODE_PROXY_HOST", "0.0.0.0"))
    port: int = field(
        default_factory=lambda: int(os.environ.get("TRANSCODE_PROXY_PORT", "5010"))
    )
    # In-memory cache max size in bytes
    cache_max_bytes: int = field(
        default_factory=lambda: int(os.environ.get("TRANSCODE_PROXY_CACHE_MB", "500")) * 1024 * 1024
    )
    # FFmpeg binary
    ffmpeg_path: str = field(
        default_factory=lambda: os.environ.get("TRANSCODE_PROXY_FFMPEG", "ffmpeg")
    )
    # H.264 bitrate for transcoded segments
    h264_bitrate: str = field(
        default_factory=lambda: os.environ.get("TRANSCODE_PROXY_H264_BITRATE", "128k")
    )
    # Max output size for transcoded playback; preserves aspect ratio and will not upscale
    max_width: int = field(
        default_factory=lambda: int(os.environ.get("TRANSCODE_PROXY_MAX_WIDTH", "640"))
    )
    max_height: int = field(
        default_factory=lambda: int(os.environ.get("TRANSCODE_PROXY_MAX_HEIGHT", "480"))
    )


config = Config()
