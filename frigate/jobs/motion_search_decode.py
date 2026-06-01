"""Hardware-accelerated ffmpeg decode for motion search.

Replaces the per-frame ``cv2.VideoCapture`` decode loop with an ffmpeg
subprocess that decodes a recording segment, selects only the sampled frame
indices in the filter graph, and streams raw ``bgr24`` frames over a pipe.
Output stays ``bgr24`` (not the gray plane) so the existing motion math is
byte-identical; no scaling is applied so pixels are unchanged.
"""

import json
import logging
import os
import subprocess as sp
import tempfile
from collections.abc import Callable, Generator
from typing import IO

import numpy as np

from frigate.config import CameraConfig
from frigate.const import FFMPEG_HWACCEL_NVIDIA, FFMPEG_HWACCEL_VAAPI
from frigate.ffmpeg_presets import parse_preset_hardware_acceleration_decode
from frigate.util.services import auto_detect_hwaccel

logger = logging.getLogger(__name__)

# Only accelerators whose decoded surfaces download cleanly to nv12 are used for
# motion search. The decode path appends a fixed ``hwdownload,format=nv12`` step,
# which is correct for these presets but not for surfaces like drm_prime (rkmpp),
# vulkan, or amf. Anything outside this set decodes in software so results stay
# byte-identical instead of risking a wrong-but-valid-sized frame that the
# zero-frame fallback gate would not catch.
_NV12_HWACCEL_PRESETS = frozenset(
    {
        FFMPEG_HWACCEL_VAAPI,
        FFMPEG_HWACCEL_NVIDIA,
        "preset-intel-qsv-h264",
        "preset-intel-qsv-h265",
    }
)


def build_motion_decode_command(
    ffmpeg_path: str,
    recording_path: str,
    start_frame: int,
    end_frame: int,
    frame_step: int,
    decode_args: list[str],
    *,
    crop: tuple[int, int, int, int] | None = None,
    scale: tuple[int, int] | None = None,
    gray: bool = False,
) -> list[str]:
    """Build the ffmpeg argv for decoding the sampled frames of a segment.

    The ``select`` expression is frame-number based so it lands on the exact
    absolute frame indices the motion loop processes. Optional ``crop`` (w, h,
    x, y), ``scale`` (w, h), and ``gray`` shrink the output for the lossy modes;
    with all three at their defaults the command is identical to the full-res
    bgr24 path.
    """
    select = (
        f"select=gte(n\\,{start_frame})"
        f"*not(mod(n-{start_frame}\\,{frame_step}))"
        f"*lt(n\\,{end_frame})"
    )

    filters = [select]
    # With hwaccel, decoded frames are GPU surfaces; pull them back to system
    # memory before any CPU crop/scale and the rawvideo encoder.
    if decode_args:
        filters.append("hwdownload")
        filters.append("format=nv12")
    if crop is not None:
        cw, ch, cx, cy = crop
        filters.append(f"crop={cw}:{ch}:{cx}:{cy}")
    if scale is not None:
        sw, sh = scale
        filters.append(f"scale={sw}:{sh}")

    vf = ",".join(filters)
    pix_fmt = "gray" if gray else "bgr24"

    return [
        ffmpeg_path,
        "-hide_banner",
        "-loglevel",
        "error",
        *decode_args,
        "-i",
        recording_path,
        "-an",
        "-vf",
        vf,
        "-vsync",
        "0",
        "-f",
        "rawvideo",
        "-pix_fmt",
        pix_fmt,
        "pipe:",
    ]


def resolve_motion_decode_args(camera_config: CameraConfig) -> list[str]:
    """Resolve the ffmpeg hwaccel decode args for a camera's recordings.

    ``auto`` is resolved via ``auto_detect_hwaccel``. Only presets in
    ``_NV12_HWACCEL_PRESETS`` are accelerated; any other value (an exotic preset
    or custom args) returns an empty list so the segment decodes in software,
    preserving byte-identical results. An empty list means software decode.
    """
    raw = camera_config.ffmpeg.hwaccel_args
    preset = auto_detect_hwaccel() if raw == "auto" else raw

    # Custom args (a list) or any non-allowlisted preset decode in software.
    if not isinstance(preset, str) or preset not in _NV12_HWACCEL_PRESETS:
        return []

    return (
        parse_preset_hardware_acceleration_decode(
            preset,
            camera_config.detect.fps,
            camera_config.detect.width or 0,
            camera_config.detect.height or 0,
            camera_config.ffmpeg.gpu,
        )
        or []
    )


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


def _expected_frame_count(start_frame: int, end_frame: int, frame_step: int) -> int:
    """Number of sampled frames the select filter should emit for a segment."""
    if end_frame <= start_frame:
        return 0
    return (end_frame - start_frame + frame_step - 1) // frame_step


def _decode_segment(
    cmd: list[str],
    recording_path: str,
    frame_size: int,
    frame_width: int,
    frame_height: int,
    start_frame: int,
    end_frame: int,
    frame_step: int,
    should_stop: Callable[[], bool],
    *,
    channels: int = 3,
) -> Generator[tuple[int, np.ndarray], None, int]:
    """Run one ffmpeg decode and yield (absolute_frame_index, bgr_frame).

    Returns the number of frames produced so the caller can decide whether a
    fallback decode is needed. ffmpeg stderr is captured to a temp file (not a
    pipe, to avoid a full-pipe stall while we read stdout) and surfaced if the
    decode ends before all expected frames were produced.
    """
    stopped = False
    # SpooledTemporaryFile keeps the (small, -loglevel error) stderr in memory.
    stderr_file = tempfile.SpooledTemporaryFile(max_size=65536)
    proc = sp.Popen(cmd, stdout=sp.PIPE, stderr=stderr_file)
    assert proc.stdout is not None  # stdout=PIPE always provides a stream
    count = 0
    frame_idx = start_frame
    try:
        while frame_idx < end_frame:
            if should_stop():
                stopped = True
                break
            buf = _read_exact(proc.stdout, frame_size)
            if buf is None:
                break
            # frombuffer returns a read-only view; the consumer copies it via
            # cv2.cvtColor before any mutation, so this is safe.
            if channels == 1:
                frame = np.frombuffer(buf, dtype=np.uint8).reshape(
                    (frame_height, frame_width)
                )
            else:
                frame = np.frombuffer(buf, dtype=np.uint8).reshape(
                    (frame_height, frame_width, channels)
                )
            count += 1
            yield frame_idx, frame
            frame_idx += frame_step
    finally:
        _terminate(proc)
        expected = _expected_frame_count(start_frame, end_frame, frame_step)
        if not stopped and not should_stop() and count < expected:
            # The decode ended early (e.g. the process died mid-stream). Frames
            # already yielded cannot be retracted, so this segment's results may
            # be incomplete -- surface it rather than fail silently.
            stderr_file.seek(0)
            err = stderr_file.read().decode("utf-8", "replace").strip()
            err_tail = err.splitlines()[-1] if err else "no ffmpeg error output"
            logger.warning(
                "Motion decode of %s ended early: produced %d of %d expected frames (%s)",
                recording_path,
                count,
                expected,
                err_tail,
            )
        stderr_file.close()
    return count


def iter_segment_frames(
    ffmpeg_path: str,
    recording_path: str,
    start_frame: int,
    end_frame: int,
    frame_step: int,
    frame_width: int,
    frame_height: int,
    decode_args: list[str],
    should_stop: Callable[[], bool],
    *,
    channels: int = 3,
    crop: tuple[int, int, int, int] | None = None,
    scale: tuple[int, int] | None = None,
    gray: bool = False,
) -> Generator[tuple[int, np.ndarray], None, None]:
    """Yield sampled (absolute_frame_index, bgr_frame) tuples for a segment.

    Tries hardware-accelerated decode when ``decode_args`` is non-empty. If that
    produces no frames (e.g. the preset is unsupported on this host), falls back
    once to software decode. Optional ``crop``/``scale``/``gray`` (with a
    matching ``channels`` count) shrink the output for the lossy modes; the
    defaults yield the full-res bgr24 path unchanged.
    """
    frame_size = frame_width * frame_height * channels

    if decode_args:
        hw_cmd = build_motion_decode_command(
            ffmpeg_path,
            recording_path,
            start_frame,
            end_frame,
            frame_step,
            decode_args,
            crop=crop,
            scale=scale,
            gray=gray,
        )
        produced = yield from _decode_segment(
            hw_cmd,
            recording_path,
            frame_size,
            frame_width,
            frame_height,
            start_frame,
            end_frame,
            frame_step,
            should_stop,
            channels=channels,
        )
        if produced > 0 or should_stop():
            return
        logger.warning(
            "Hardware decode produced no frames for %s, falling back to software decode",
            recording_path,
        )

    sw_cmd = build_motion_decode_command(
        ffmpeg_path,
        recording_path,
        start_frame,
        end_frame,
        frame_step,
        [],
        crop=crop,
        scale=scale,
        gray=gray,
    )
    yield from _decode_segment(
        sw_cmd,
        recording_path,
        frame_size,
        frame_width,
        frame_height,
        start_frame,
        end_frame,
        frame_step,
        should_stop,
        channels=channels,
    )


KEYFRAME_MAX_GAP_SECONDS = 2.0


def _ffprobe_path(ffmpeg_path: str) -> str:
    """Derive the ffprobe path that sits next to the configured ffmpeg binary."""
    directory = os.path.dirname(ffmpeg_path)
    return os.path.join(directory, "ffprobe") if directory else "ffprobe"


def probe_keyframe_pts(ffprobe_path: str, recording_path: str) -> list[float]:
    """Return sorted keyframe presentation timestamps (seconds) for a segment.

    Reads video packet flags via ffprobe (no decode). Returns [] on any failure
    so callers fall back to every-Nth sampling.
    """
    cmd = [
        ffprobe_path,
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_packets",
        "-show_entries",
        "packet=pts_time,flags",
        "-of",
        "json",
        recording_path,
    ]
    try:
        completed = sp.run(cmd, capture_output=True, text=True, timeout=30)
    except (OSError, sp.SubprocessError):
        logger.warning("ffprobe failed for keyframe probe of %s", recording_path)
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


def build_keyframe_decode_command(
    ffmpeg_path: str,
    recording_path: str,
    decode_args: list[str],
    crop: tuple[int, int, int, int] | None,
    scale: tuple[int, int] | None,
    gray: bool,
) -> list[str]:
    """Build an ffmpeg argv that decodes only keyframes (-skip_frame nokey)."""
    filters = []
    if decode_args:
        filters.append("hwdownload")
        filters.append("format=nv12")
    if crop is not None:
        cw, ch, cx, cy = crop
        filters.append(f"crop={cw}:{ch}:{cx}:{cy}")
    if scale is not None:
        sw, sh = scale
        filters.append(f"scale={sw}:{sh}")

    pix_fmt = "gray" if gray else "bgr24"
    cmd = [
        ffmpeg_path,
        "-hide_banner",
        "-loglevel",
        "error",
        "-skip_frame",
        "nokey",
        *decode_args,
        "-i",
        recording_path,
        "-an",
    ]
    if filters:
        cmd += ["-vf", ",".join(filters)]
    cmd += ["-vsync", "0", "-f", "rawvideo", "-pix_fmt", pix_fmt, "pipe:"]
    return cmd


def iter_keyframe_frames(
    ffmpeg_path: str,
    recording_path: str,
    out_width: int,
    out_height: int,
    channels: int,
    decode_args: list[str],
    crop: tuple[int, int, int, int] | None,
    scale: tuple[int, int] | None,
    gray: bool,
    should_stop: Callable[[], bool],
) -> Generator[np.ndarray, None, None]:
    """Yield decoded keyframes in order (no frame index; pair with probed PTS)."""
    cmd = build_keyframe_decode_command(
        ffmpeg_path, recording_path, decode_args, crop, scale, gray
    )
    frame_size = out_width * out_height * channels
    stderr_file = tempfile.SpooledTemporaryFile(max_size=65536)
    proc = sp.Popen(cmd, stdout=sp.PIPE, stderr=stderr_file)
    assert proc.stdout is not None
    try:
        while True:
            if should_stop():
                break
            buf = _read_exact(proc.stdout, frame_size)
            if buf is None:
                break
            if channels == 1:
                yield np.frombuffer(buf, dtype=np.uint8).reshape(
                    (out_height, out_width)
                )
            else:
                yield np.frombuffer(buf, dtype=np.uint8).reshape(
                    (out_height, out_width, channels)
                )
    finally:
        _terminate(proc)
        stderr_file.close()


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
