"""Frigate-managed go2rtc live streams: transcoded rungs and bitrate probes."""

import logging
import re
import time
from typing import TYPE_CHECKING, Any

import requests

if TYPE_CHECKING:
    from frigate.config import FrigateConfig

logger = logging.getLogger(__name__)

GO2RTC_API = "http://127.0.0.1:1984/api"

DEFAULT_TRANSCODE_QUALITIES: list[dict[str, int]] = [
    {"height": 720, "bitrate": 1200},
    {"height": 480, "bitrate": 500},
    {"height": 360, "bitrate": 250},
]


def transcode_stream_name(camera: str, height: int) -> str:
    """Return the go2rtc name of a camera's transcoded stream at one height."""
    return f"{camera}_transcode_{height}p"


def is_transcode_stream_name(camera: str, name: str) -> bool:
    """Return whether a stream name follows this camera's transcoded naming."""
    return re.fullmatch(rf"{re.escape(camera)}_transcode_\d+p", name) is not None


def transcode_stream_source(source: str, height: int, bitrate: int) -> str:
    """Build the go2rtc ffmpeg source that transcodes a stream to H.264.

    go2rtc rejects API-registered sources containing spaces, so each ffmpeg
    token gets its own #raw= parameter. #audio=copy keeps audio, which any
    #video= option would otherwise drop.
    """
    tokens = (
        "-b:v",
        f"{bitrate}k",
        "-maxrate",
        f"{bitrate}k",
        "-bufsize",
        f"{2 * bitrate}k",
    )
    raw = "".join(f"#raw={token}" for token in tokens)
    return f"ffmpeg:{source}#video=h264#height={height}#hardware#audio=copy{raw}"


def transcode_streams(
    camera: str, source: str, qualities: list[dict[str, int]]
) -> dict[str, str]:
    """Map each quality's go2rtc stream name to its source."""
    return {
        transcode_stream_name(camera, quality["height"]): transcode_stream_source(
            source, quality["height"], quality["bitrate"]
        )
        for quality in qualities
    }


def default_transcode_source(camera: str, streams: dict[str, str]) -> str | None:
    """Return the first live stream that is not itself transcoded."""
    return next(
        (
            name
            for name in streams.values()
            if not is_transcode_stream_name(camera, name)
        ),
        None,
    )


def raw_transcode_streams(config: dict[str, Any]) -> dict[str, str]:
    """Build transcoded go2rtc streams for every enabled camera in a raw config.

    go2rtc's config is written before FrigateConfig validation runs, so this
    resolves defaults the same way the validator does.
    """
    streams: dict[str, str] = {}

    for camera, camera_config in (config.get("cameras") or {}).items():
        live = (camera_config or {}).get("live") or {}
        transcode = live.get("transcode") or {}

        if not transcode.get("enabled"):
            continue

        source = transcode.get("source") or default_transcode_source(
            camera, live.get("streams") or {camera: camera}
        )

        if source is None:
            continue

        qualities = transcode.get("qualities")

        if qualities is None:
            qualities = DEFAULT_TRANSCODE_QUALITIES

        # malformed entries fail Frigate's validation; skipping them here keeps
        # go2rtc from crash-looping alongside it
        valid = [
            quality
            for quality in (qualities if isinstance(qualities, list) else [])
            if isinstance(quality, dict)
            and "height" in quality
            and "bitrate" in quality
        ]
        streams.update(transcode_streams(camera, source, valid))

    return streams


def generated_transcode_streams(config: "FrigateConfig") -> dict[str, str]:
    """Build transcoded go2rtc streams for every enabled camera."""
    streams: dict[str, str] = {}

    for camera in config.cameras.values():
        transcode = camera.live.transcode

        if transcode.enabled and transcode.source:
            streams.update(
                transcode_streams(
                    camera.name,
                    transcode.source,
                    [quality.model_dump() for quality in transcode.qualities],
                )
            )

    return streams


def _go2rtc_streams_call(method: str, name: str, params: dict[str, str]) -> bool:
    try:
        response = requests.request(
            method, f"{GO2RTC_API}/streams", params=params, timeout=5
        )
    except requests.RequestException as e:
        logger.error("Failed to sync go2rtc stream %s: %s", name, e)
        return False

    if not response.ok:
        logger.error("Failed to sync go2rtc stream %s: %s", name, response.text)
        return False

    return True


def sync_transcode_streams(old: dict[str, str], new: dict[str, str]) -> bool:
    """Register added or changed streams with go2rtc and remove dropped ones.

    Returns False when any go2rtc call failed.
    """
    ok = True

    for name, source in new.items():
        if old.get(name) != source:
            ok = _go2rtc_streams_call("put", name, {"name": name, "src": source}) and ok

    for name in old.keys() - new.keys():
        ok = _go2rtc_streams_call("delete", name, {"src": name}) and ok

    return ok


def measure_stream_bitrate(
    name: str, duration: float = 6.0, warmup: float = 1.0
) -> float | None:
    """Measure a go2rtc stream's average kbps from its local MP4 output.

    The first warmup seconds after the first byte are skipped so the startup
    keyframe burst does not inflate the result. Returns None when the stream
    sends nothing.
    """
    first = start = now = None
    counted = 0

    try:
        with requests.get(
            f"{GO2RTC_API}/stream.mp4",
            params={"src": name},
            stream=True,
            timeout=5,
        ) as response:
            if not response.ok:
                return None

            for chunk in response.iter_content(chunk_size=16384):
                now = time.monotonic()

                if first is None:
                    first = now

                if now - first < warmup:
                    continue

                if start is None:
                    start = now
                    continue

                counted += len(chunk)

                if now - start >= duration:
                    break
    except requests.RequestException as e:
        logger.warning("Failed to measure go2rtc stream %s: %s", name, e)
        return None

    if start is None or now is None or now <= start or counted == 0:
        return None

    return counted * 8 / 1000 / (now - start)
