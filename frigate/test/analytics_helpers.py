"""Shared fixtures for the analytics tests."""

from typing import Any

from frigate.analytics.context import ReportContext
from frigate.config import FrigateConfig

FRONT_CAMERA: dict[str, Any] = {
    "ffmpeg": {"inputs": [{"path": "rtsp://10.0.0.1:554/video", "roles": ["detect"]}]},
    "detect": {"height": 720, "width": 1280, "fps": 5},
}


def make_config(config: dict[str, Any] | None = None) -> FrigateConfig:
    """A parsed config; top-level keys in config replace the defaults here.

    hwaccel_args is set so parsing never probes the test host's GPU.
    """
    base: dict[str, Any] = {
        "mqtt": {"host": "mqtt"},
        "ffmpeg": {"hwaccel_args": []},
        "cameras": {"front": FRONT_CAMERA},
    }
    return FrigateConfig(**{**base, **(config or {})})


def make_context(
    config: FrigateConfig | None = None,
    stats: dict[str, Any] | None = None,
    notice_stats: list[dict[str, Any]] | None = None,
) -> ReportContext:
    return ReportContext(
        config=config or make_config(),
        stats=stats or {},
        notice_stats=notice_stats or [],
    )
