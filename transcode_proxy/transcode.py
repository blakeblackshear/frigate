"""Transcode media segments to H.264 transport stream bytes using FFmpeg."""
import asyncio
import logging
import subprocess
from collections.abc import AsyncIterable, AsyncIterator
from typing import Optional

logger = logging.getLogger(__name__)


class TranscodeError(RuntimeError):
    """Raised when FFmpeg cannot produce a valid transcoded segment."""


def _build_scale_filter(max_width: int, max_height: int) -> Optional[str]:
    if max_width <= 0 or max_height <= 0:
        return None

    return (
        f"scale=w={max_width}:h={max_height}:"
        "force_original_aspect_ratio=decrease:"
        "force_divisible_by=2"
    )


def _build_ffmpeg_cmd(
    ffmpeg_path: str,
    bitrate: str,
    max_width: int,
    max_height: int,
) -> list[str]:
    cmd = [
        ffmpeg_path,
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-an",
        "-pix_fmt",
        "yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-profile:v",
        "high",
        "-level:v",
        "3.1",
        "-b:v",
        bitrate,
        "-maxrate",
        bitrate,
        "-bufsize",
        bitrate,
        "-muxdelay",
        "0",
        "-muxpreload",
        "0",
        "-f",
        "mpegts",
        "-mpegts_flags",
        "+initial_discontinuity",
        "pipe:1",
    ]

    scale_filter = _build_scale_filter(max_width, max_height)
    if scale_filter:
        cmd[7:7] = ["-vf", scale_filter]

    return cmd


class H264TSStream:
    """Manage a streaming FFmpeg transcode process."""

    def __init__(self, process: asyncio.subprocess.Process):
        self._process = process
        self._stderr = bytearray()
        self._output = bytearray()
        self._input_error: Exception | None = None
        self._closed = False
        self._stdin_task: asyncio.Task[None] | None = None
        self._stderr_task: asyncio.Task[None] | None = None

    @classmethod
    async def start(
        cls,
        source_chunks: AsyncIterable[bytes],
        ffmpeg_path: str,
        bitrate: str = "2M",
        max_width: int = 640,
        max_height: int = 480,
    ) -> "H264TSStream":
        process = await asyncio.create_subprocess_exec(
            *_build_ffmpeg_cmd(ffmpeg_path, bitrate, max_width, max_height),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stream = cls(process)
        stream._stdin_task = asyncio.create_task(stream._feed_stdin(source_chunks))
        stream._stderr_task = asyncio.create_task(stream._drain_stderr())
        return stream

    async def _feed_stdin(self, source_chunks: AsyncIterable[bytes]) -> None:
        assert self._process.stdin is not None

        try:
            async for chunk in source_chunks:
                if not chunk:
                    continue
                self._process.stdin.write(chunk)
                await self._process.stdin.drain()
        except (BrokenPipeError, ConnectionResetError) as exc:
            self._input_error = exc
        except Exception as exc:  # pragma: no cover - depends on upstream/network failures
            self._input_error = exc
        finally:
            stdin = self._process.stdin
            if stdin is not None and not stdin.is_closing():
                stdin.close()
                try:
                    await stdin.wait_closed()
                except Exception:
                    pass

    async def _drain_stderr(self) -> None:
        assert self._process.stderr is not None

        while True:
            chunk = await self._process.stderr.read(8192)
            if not chunk:
                break
            self._stderr.extend(chunk)

    async def _read_stdout_chunk(self) -> bytes:
        assert self._process.stdout is not None
        chunk = await self._process.stdout.read(65536)
        if chunk:
            self._output.extend(chunk)
        return chunk

    def _error_message(self) -> str:
        if self._input_error is not None:
            return f"Source stream failed: {self._input_error}"
        if self._stderr:
            return self._stderr.decode(errors="replace")
        return "unknown FFmpeg error"

    async def _ensure_success(self) -> bytes:
        if self._stdin_task is not None:
            await self._stdin_task
        if self._stderr_task is not None:
            await self._stderr_task

        returncode = await self._process.wait()
        if returncode != 0:
            raise TranscodeError(self._error_message())

        return bytes(self._output)

    async def first_chunk(self) -> bytes:
        chunk = await self._read_stdout_chunk()
        if chunk:
            return chunk

        try:
            await self._ensure_success()
        finally:
            self._closed = True

        raise TranscodeError("FFmpeg produced no output")

    async def iter_chunks(self, first_chunk: bytes) -> AsyncIterator[bytes]:
        try:
            yield first_chunk
            while True:
                chunk = await self._read_stdout_chunk()
                if not chunk:
                    break
                yield chunk

            await self._ensure_success()
        finally:
            await self.aclose()

    async def aclose(self) -> None:
        if self._closed:
            return

        self._closed = True

        if self._process.returncode is None:
            self._process.kill()
            await self._process.wait()

        for task in (self._stdin_task, self._stderr_task):
            if task is None or task.done():
                continue
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    @property
    def output_bytes(self) -> bytes:
        return bytes(self._output)


async def stream_transcode_segment_to_h264_ts(
    source_chunks: AsyncIterable[bytes],
    ffmpeg_path: str,
    bitrate: str = "2M",
    max_width: int = 640,
    max_height: int = 480,
) -> H264TSStream:
    """Start an FFmpeg process that streams H.264 MPEG-TS output."""
    return await H264TSStream.start(
        source_chunks,
        ffmpeg_path,
        bitrate,
        max_width,
        max_height,
    )


def transcode_segment_to_h264_ts(
    segment_bytes: bytes,
    ffmpeg_path: str,
    bitrate: str = "2M",
    max_width: int = 640,
    max_height: int = 480,
) -> Optional[bytes]:
    """Decode a segment and re-encode it as H.264 MPEG-TS bytes."""
    try:
        result = subprocess.run(
            _build_ffmpeg_cmd(ffmpeg_path, bitrate, max_width, max_height),
            input=segment_bytes,
            capture_output=True,
            timeout=60,
        )
        if result.returncode != 0:
            logger.warning(
                "FFmpeg transcode failed: %s",
                result.stderr.decode(errors="replace") if result.stderr else "unknown",
            )
            return None
        return result.stdout
    except subprocess.TimeoutExpired:
        logger.warning("FFmpeg transcode timed out")
        return None
    except Exception as e:
        logger.warning("FFmpeg transcode error: %s", e)
        return None
