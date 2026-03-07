"""Utilities for media file inspection."""

import subprocess as sp

from frigate.const import DEFAULT_FFMPEG_VERSION

FFPROBE_PATH = (
    f"/usr/lib/ffmpeg/{DEFAULT_FFMPEG_VERSION}/bin/ffprobe"
    if DEFAULT_FFMPEG_VERSION
    else "ffprobe"
)


def get_keyframe_before(path: str, offset_ms: int) -> int | None:
    """Get the timestamp (ms) of the last keyframe at or before offset_ms.

    Uses ffprobe packet index to read keyframe positions from the mp4 file.
    Returns None if ffprobe fails or no keyframe is found before the offset.
    """
    try:
        result = sp.run(
            [
                FFPROBE_PATH,
                "-select_streams",
                "v:0",
                "-show_entries",
                "packet=pts_time,flags",
                "-of",
                "csv=p=0",
                "-loglevel",
                "error",
                path,
            ],
            capture_output=True,
            timeout=5,
        )
    except (sp.TimeoutExpired, FileNotFoundError):
        return None

    if result.returncode != 0:
        return None

    offset_s = offset_ms / 1000.0
    best_ms = None
    for line in result.stdout.decode().strip().splitlines():
        parts = line.strip().split(",")
        if len(parts) != 2:
            continue
        ts_str, flags = parts
        if "K" not in flags:
            continue
        try:
            ts = float(ts_str)
        except ValueError:
            continue
        if ts <= offset_s:
            best_ms = int(ts * 1000)
        else:
            break

    return best_ms
