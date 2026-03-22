"""On-demand H.265 to H.264 transcoded HLS endpoint."""

import asyncio
import logging
import os
import subprocess as sp
import time
from hashlib import md5
from pathlib import Path

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from frigate.api.auth import require_camera_access, require_role
from frigate.api.defs.tags import Tags
from frigate.config import FrigateConfig
from frigate.const import PROCESS_PRIORITY_LOW

logger = logging.getLogger(__name__)

router = APIRouter(tags=[Tags.media])

TRANSCODE_DIR = "/tmp/stream/transcode"
MAX_CONCURRENT_TRANSCODES = 3
TRANSCODE_TTL_SECONDS = 600
SEGMENT_WAIT_TIMEOUT = 30

# Active transcode sessions: session_id -> subprocess.Popen
_active_sessions: dict[str, sp.Popen] = {}


def _lower_priority():
    os.nice(PROCESS_PRIORITY_LOW)


def _session_id(camera: str, start_ts: float, end_ts: float) -> str:
    """Deterministic session ID for deduplication."""
    raw = f"{camera}_{start_ts}_{end_ts}"
    return md5(raw.encode()).hexdigest()[:12]


def _session_dir(session_id: str) -> str:
    return os.path.join(TRANSCODE_DIR, session_id)


def _session_playlist(session_id: str) -> str:
    return os.path.join(_session_dir(session_id), "master.m3u8")


def _is_session_alive(session_id: str) -> bool:
    """Check if a transcode session FFmpeg process is still running."""
    proc = _active_sessions.get(session_id)
    if proc is None:
        return False
    return proc.poll() is None


def _get_internal_port(config: FrigateConfig) -> int:
    """Get the internal API port, handling string ip:port format."""
    internal_port = config.networking.listen.internal
    if isinstance(internal_port, str):
        internal_port = int(internal_port.split(":")[-1])
    return int(internal_port)


def _build_ffmpeg_cmd(
    config: FrigateConfig,
    camera_name: str,
    start_ts: float,
    end_ts: float,
    session_id: str,
) -> list[str]:
    """Build FFmpeg command that consumes existing HLS and outputs transcoded HLS."""
    internal_port = _get_internal_port(config)
    input_url = (
        f"http://127.0.0.1:{internal_port}"
        f"/vod/{camera_name}/start/{start_ts}/end/{end_ts}/index.m3u8"
    )

    output_dir = _session_dir(session_id)
    os.makedirs(output_dir, exist_ok=True)

    output_playlist = os.path.join(output_dir, "master.m3u8")
    segment_pattern = os.path.join(output_dir, "segment-%d.ts")

    return [
        config.ffmpeg.ffmpeg_path,
        "-hide_banner",
        "-loglevel",
        "warning",
        "-y",
        "-protocol_whitelist",
        "pipe,file,http,tcp",
        "-i",
        input_url,
        # Encode to H.264 (software — universally available)
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-profile:v",
        "high",
        "-level:v",
        "4.1",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        # Output as HLS with MPEG-TS segments
        "-f",
        "hls",
        "-hls_time",
        "6",
        "-hls_list_size",
        "0",
        "-hls_segment_type",
        "mpegts",
        "-hls_flags",
        "independent_segments+append_list",
        "-hls_segment_filename",
        segment_pattern,
        output_playlist,
    ]


async def _wait_for_playlist(session_id: str) -> bool:
    """Wait until FFmpeg has written the playlist and at least one segment."""
    playlist = _session_playlist(session_id)
    deadline = time.monotonic() + SEGMENT_WAIT_TIMEOUT

    while time.monotonic() < deadline:
        if os.path.exists(playlist) and os.path.getsize(playlist) > 0:
            session_dir = _session_dir(session_id)
            segments = list(Path(session_dir).glob("segment-*.ts"))
            if segments:
                return True

        if not _is_session_alive(session_id):
            proc = _active_sessions.get(session_id)
            if proc:
                stderr = proc.stderr.read() if proc.stderr else b""
                logger.error(
                    "Transcode FFmpeg exited with code %d: %s",
                    proc.returncode,
                    stderr.decode(errors="replace"),
                )
            return False

        await asyncio.sleep(0.5)

    return False


def cleanup_session(session_id: str) -> None:
    """Stop FFmpeg and remove temp files for a session."""
    proc = _active_sessions.pop(session_id, None)
    if proc and proc.poll() is None:
        proc.terminate()
        try:
            proc.communicate(timeout=10)
        except sp.TimeoutExpired:
            proc.kill()
            proc.communicate()

    session_dir = _session_dir(session_id)
    if os.path.exists(session_dir):
        for f in Path(session_dir).iterdir():
            f.unlink(missing_ok=True)
        try:
            Path(session_dir).rmdir()
        except OSError:
            pass


def cleanup_stale_transcode_sessions() -> None:
    """Remove transcode sessions older than TTL. Called from cleanup loop."""
    if not os.path.exists(TRANSCODE_DIR):
        return

    now = time.time()
    for session_dir in Path(TRANSCODE_DIR).iterdir():
        if not session_dir.is_dir():
            continue

        age = now - session_dir.stat().st_mtime
        if age > TRANSCODE_TTL_SECONDS:
            session_id = session_dir.name
            logger.debug("Cleaning up stale transcode session %s", session_id)
            cleanup_session(session_id)


@router.get(
    "/transcode/{camera_name}/start/{start_ts}/end/{end_ts}",
    dependencies=[Depends(require_camera_access)],
    description="Start a transcoded HLS session that converts H.265 recordings to H.264 for browser compatibility.",
)
async def transcoded_vod(
    request: Request,
    camera_name: str,
    start_ts: float,
    end_ts: float,
):
    """Start or reuse a transcoded HLS session for the given time range."""
    config: FrigateConfig = request.app.frigate_config
    session_id = _session_id(camera_name, start_ts, end_ts)

    # Reuse existing session if still alive
    if _is_session_alive(session_id):
        playlist = _session_playlist(session_id)
        if os.path.exists(playlist):
            return JSONResponse(
                content={
                    "success": True,
                    "playlist": f"/stream/transcode/{session_id}/master.m3u8",
                }
            )

    # Check concurrent transcode limit
    active_count = sum(1 for p in _active_sessions.values() if p.poll() is None)
    if active_count >= MAX_CONCURRENT_TRANSCODES:
        return JSONResponse(
            content={
                "success": False,
                "message": "Too many concurrent transcode sessions",
            },
            status_code=429,
        )

    ffmpeg_cmd = _build_ffmpeg_cmd(config, camera_name, start_ts, end_ts, session_id)

    logger.info(
        "Starting transcode session %s for %s (%s -> %s)",
        session_id,
        camera_name,
        start_ts,
        end_ts,
    )

    proc = sp.Popen(
        ffmpeg_cmd,
        stdout=sp.DEVNULL,
        stderr=sp.PIPE,
        stdin=sp.DEVNULL,
        start_new_session=True,
        preexec_fn=_lower_priority,
    )
    _active_sessions[session_id] = proc

    ready = await _wait_for_playlist(session_id)
    if not ready:
        cleanup_session(session_id)
        return JSONResponse(
            content={
                "success": False,
                "message": "Transcode timed out waiting for first segment",
            },
            status_code=504,
        )

    return JSONResponse(
        content={
            "success": True,
            "playlist": f"/stream/transcode/{session_id}/master.m3u8",
        }
    )


@router.delete(
    "/transcode/{session_id}",
    dependencies=[Depends(require_role(["admin"]))],
)
async def stop_transcode(session_id: str):
    """Stop and clean up a transcode session."""
    cleanup_session(session_id)
    return JSONResponse(content={"success": True})
