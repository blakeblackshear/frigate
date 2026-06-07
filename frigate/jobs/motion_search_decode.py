"""Hardware-accelerated ffmpeg decode for motion search.

Decodes a recording run's VOD/HLS stream with an ffmpeg subprocess, optionally
selecting only keyframes, and streams raw frames over a pipe for the motion
math. Output is the requested ``pix_fmt`` (gray or ``bgr24``) with optional
crop/scale applied in the filter graph so downstream pixels are unchanged.
"""

import json
import logging
import subprocess as sp
import tempfile
from collections.abc import Callable, Generator
from typing import IO

import numpy as np

from frigate.config import CameraConfig
from frigate.ffmpeg_presets import parse_preset_hardware_acceleration_decode
from frigate.util.services import auto_detect_hwaccel

logger = logging.getLogger(__name__)

# Output-format surfaces that download cleanly to nv12 via the fixed
# ``hwdownload,format=nv12`` step the decode path appends. Other surfaces
# (drm_prime from rkmpp, vulkan, amf) need a different download step, so motion
# search decodes them in software to keep results byte-identical rather than risk
# a wrong-but-valid-sized frame the zero-frame fallback gate would not catch.
_NV12_OUTPUT_FORMATS = frozenset({"vaapi", "cuda", "qsv"})


def _hwaccel_output_format(decode_args: list[str]) -> str | None:
    """Return the ``-hwaccel_output_format`` value in ffmpeg args, or None."""
    try:
        idx = decode_args.index("-hwaccel_output_format")
    except ValueError:
        return None
    return decode_args[idx + 1] if idx + 1 < len(decode_args) else None


def resolve_motion_decode_args(camera_config: CameraConfig) -> list[str]:
    """Resolve the ffmpeg hwaccel decode args for a camera's recordings.

    ``auto`` is resolved via ``auto_detect_hwaccel`` and the preset is expanded
    by ``parse_preset_hardware_acceleration_decode`` (the same table the live
    pipeline uses). Acceleration is kept only when the decoded surface downloads
    cleanly to nv12 -- decided by reading ``-hwaccel_output_format`` back from the
    resolved args rather than a separate preset allowlist that could drift from
    ``PRESETS_HW_ACCEL_DECODE``. Anything else (custom args, a software-only
    preset, or an nv12-incompatible surface) returns an empty list, meaning
    software decode, so results stay byte-identical.
    """
    raw = camera_config.ffmpeg.hwaccel_args
    preset = auto_detect_hwaccel() if raw == "auto" else raw

    # Custom args (a list) decode in software so results stay byte-identical.
    if not isinstance(preset, str):
        return []

    decode_args = parse_preset_hardware_acceleration_decode(
        preset,
        camera_config.detect.fps,
        camera_config.detect.width or 0,
        camera_config.detect.height or 0,
        camera_config.ffmpeg.gpu,
    )
    if not decode_args:
        return []

    if _hwaccel_output_format(decode_args) not in _NV12_OUTPUT_FORMATS:
        return []

    return decode_args


def _read_exact(stream: IO[bytes], size: int) -> bytes | None:
    """Read exactly ``size`` bytes from a pipe, or None at clean EOF.

    Pipe reads can return fewer bytes than requested, so loop until the frame
    is complete. A short read at the start of a frame means end-of-stream.
    """
    buf = bytearray()
    while len(buf) < size:
        chunk = stream.read(size - len(buf))
        if not chunk:
            return None
        buf.extend(chunk)
    return bytes(buf)


def _terminate(proc: sp.Popen[bytes]) -> None:
    """Stop an ffmpeg decode process promptly."""
    # Close the read end first so a blocked ffmpeg write unblocks (ffmpeg then
    # sees a broken pipe), then signal it. The resulting ffmpeg write error is
    # harmless and goes to the captured stderr.
    if proc.stdout is not None:
        try:
            proc.stdout.close()
        except OSError:
            pass
    if proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except sp.TimeoutExpired:
            proc.kill()
            proc.wait()


KEYFRAME_MAX_GAP_SECONDS = 2.0


def keyframe_sampling_eligible(
    keyframe_pts: list[float], max_gap: float = KEYFRAME_MAX_GAP_SECONDS
) -> bool:
    """True if keyframes are dense and regular enough for keyframe-only sampling.

    Requires at least two keyframes and no gap longer than ``max_gap`` seconds, so
    a multi-second motion event necessarily spans a sampled keyframe.
    """
    if len(keyframe_pts) < 2:
        return False
    gaps = [b - a for a, b in zip(keyframe_pts, keyframe_pts[1:])]
    return max(gaps) <= max_gap


VOD_PROTOCOL_ARGS = ["-protocol_whitelist", "pipe,file,http,tcp"]


def build_vod_decode_command(
    ffmpeg_path: str,
    vod_url: str,
    decode_args: list[str],
    crop: tuple[int, int, int, int] | None,
    scale: tuple[int, int] | None,
    gray: bool,
    *,
    skip_nonkey: bool,
    fps_rate: float | None,
) -> list[str]:
    """Build the ffmpeg argv to decode a VOD HLS URL.

    ``skip_nonkey`` adds ``-skip_frame nokey`` (keyframe-only). ``fps_rate`` adds
    an ``fps`` filter for the fixed-cadence fallback. They are mutually
    exclusive: keyframe mode passes ``skip_nonkey=True``/``fps_rate=None``; the
    fallback passes ``skip_nonkey=False`` with a rate.
    """
    filters: list[str] = []
    # With hwaccel the decoded frames are GPU surfaces; pull them back to system
    # memory before the CPU fps/crop/scale filters and the rawvideo encoder.
    if decode_args:
        filters.append("hwdownload")
        filters.append("format=nv12")
    if fps_rate is not None:
        filters.append(f"fps={fps_rate}")
    if crop is not None:
        cw, ch, cx, cy = crop
        filters.append(f"crop={cw}:{ch}:{cx}:{cy}")
    if scale is not None:
        sw, sh = scale
        filters.append(f"scale={sw}:{sh}")

    pix_fmt = "gray" if gray else "bgr24"
    cmd = [ffmpeg_path, "-hide_banner", "-loglevel", "error"]
    if skip_nonkey:
        cmd += ["-skip_frame", "nokey"]
    cmd += [*decode_args, *VOD_PROTOCOL_ARGS, "-i", vod_url, "-an"]
    if filters:
        cmd += ["-vf", ",".join(filters)]
    cmd += ["-vsync", "0", "-f", "rawvideo", "-pix_fmt", pix_fmt, "pipe:"]
    return cmd


def _run_vod_decode(
    ffmpeg_path: str,
    vod_url: str,
    out_width: int,
    out_height: int,
    channels: int,
    decode_args: list[str],
    crop: tuple[int, int, int, int] | None,
    scale: tuple[int, int] | None,
    gray: bool,
    should_stop: Callable[[], bool],
    *,
    skip_nonkey: bool,
    fps_rate: float | None,
    software_retry: bool,
) -> Generator[np.ndarray, None, None]:
    """Run one VOD decode, yielding raw frames; retry in software if empty."""
    cmd = build_vod_decode_command(
        ffmpeg_path,
        vod_url,
        decode_args,
        crop,
        scale,
        gray,
        skip_nonkey=skip_nonkey,
        fps_rate=fps_rate,
    )
    frame_size = out_width * out_height * channels
    stderr_file = tempfile.SpooledTemporaryFile(max_size=65536)
    proc = sp.Popen(cmd, stdout=sp.PIPE, stderr=stderr_file)
    assert proc.stdout is not None

    count = 0
    try:
        while True:
            if should_stop():
                break
            buf = _read_exact(proc.stdout, frame_size)
            if buf is None:
                break
            if channels == 1:
                frame = np.frombuffer(buf, dtype=np.uint8).reshape(
                    (out_height, out_width)
                )
            else:
                frame = np.frombuffer(buf, dtype=np.uint8).reshape(
                    (out_height, out_width, channels)
                )
            count += 1
            yield frame
    finally:
        _terminate(proc)
        stderr_file.close()

    if count == 0 and software_retry and not should_stop():
        logger.warning("Hardware VOD decode produced no frames, retrying in software")
        yield from _run_vod_decode(
            ffmpeg_path,
            vod_url,
            out_width,
            out_height,
            channels,
            [],
            crop,
            scale,
            gray,
            should_stop,
            skip_nonkey=skip_nonkey,
            fps_rate=fps_rate,
            software_retry=False,
        )


def iter_vod_frames(
    ffmpeg_path: str,
    vod_url: str,
    out_width: int,
    out_height: int,
    channels: int,
    decode_args: list[str],
    crop: tuple[int, int, int, int] | None,
    scale: tuple[int, int] | None,
    gray: bool,
    should_stop: Callable[[], bool],
    *,
    skip_nonkey: bool,
    fps_rate: float | None,
) -> Generator[np.ndarray, None, None]:
    """Decode a VOD HLS URL and yield raw frames in order.

    Pair keyframe-mode output with probed keyframe PTS; pair fallback output with
    a fixed cadence. Falls back once to software decode if a hwaccel decode yields
    no frames.
    """
    yield from _run_vod_decode(
        ffmpeg_path,
        vod_url,
        out_width,
        out_height,
        channels,
        decode_args,
        crop,
        scale,
        gray,
        should_stop,
        skip_nonkey=skip_nonkey,
        fps_rate=fps_rate,
        software_retry=bool(decode_args),
    )


def probe_vod_keyframe_pts(ffprobe_path: str, vod_url: str) -> list[float]:
    """Return keyframe presentation timestamps (VOD stream time) in order.

    Reads packet flags via ffprobe over the VOD URL (no decode). Returns [] on
    any failure so the caller can fall back.
    """
    cmd = [
        ffprobe_path,
        "-v",
        "error",
        *VOD_PROTOCOL_ARGS,
        "-i",
        vod_url,
        "-select_streams",
        "v:0",
        "-show_packets",
        "-show_entries",
        "packet=pts_time,flags",
        "-of",
        "json",
    ]
    try:
        completed = sp.run(cmd, capture_output=True, text=True, timeout=120)
    except (OSError, sp.SubprocessError):
        logger.warning("ffprobe failed for VOD keyframe probe")
        return []

    if completed.returncode != 0 or not completed.stdout:
        return []

    try:
        packets = json.loads(completed.stdout).get("packets", [])
    except json.JSONDecodeError:
        return []

    pts: list[float] = []
    for pkt in packets:
        flags = pkt.get("flags", "")
        pts_time = pkt.get("pts_time")
        if flags.startswith("K") and pts_time is not None:
            try:
                pts.append(float(pts_time))
            except ValueError:
                continue
    return sorted(pts)


def probe_video_dimensions(
    ffprobe_path: str, recording_path: str
) -> tuple[int, int, float] | None:
    """Return (width, height, fps) for a recording's video stream, or None.

    Reads stream metadata via ffprobe (no decode). The record stream resolution
    can differ from the camera's detect resolution, so this is probed once per
    job against a real segment.
    """
    cmd = [
        ffprobe_path,
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,avg_frame_rate",
        "-of",
        "json",
        recording_path,
    ]
    try:
        completed = sp.run(cmd, capture_output=True, text=True, timeout=30)
    except (OSError, sp.SubprocessError):
        return None

    if completed.returncode != 0 or not completed.stdout:
        return None

    try:
        streams = json.loads(completed.stdout).get("streams", [])
    except json.JSONDecodeError:
        return None

    if not streams:
        return None

    stream = streams[0]
    width = int(stream.get("width", 0) or 0)
    height = int(stream.get("height", 0) or 0)
    rate = stream.get("avg_frame_rate", "0/0") or "0/0"
    try:
        num, _, den = rate.partition("/")
        fps = float(num) / float(den) if float(den) != 0 else 0.0
    except (ValueError, ZeroDivisionError):
        fps = 0.0

    if width <= 0 or height <= 0:
        return None

    return width, height, fps
