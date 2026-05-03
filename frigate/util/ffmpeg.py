"""FFmpeg utility functions for managing ffmpeg processes."""

import logging
import subprocess as sp
from typing import Any, Callable, Optional

from frigate.const import PROCESS_PRIORITY_LOW
from frigate.log import LogPipe


def stop_ffmpeg(ffmpeg_process: sp.Popen[Any], logger: logging.Logger):
    logger.info("Terminating the existing ffmpeg process...")
    ffmpeg_process.terminate()
    try:
        logger.info("Waiting for ffmpeg to exit gracefully...")
        ffmpeg_process.communicate(timeout=30)
        logger.info("FFmpeg has exited")
    except sp.TimeoutExpired:
        logger.info("FFmpeg didn't exit. Force killing...")
        ffmpeg_process.kill()
        ffmpeg_process.communicate()
        logger.info("FFmpeg has been killed")
    ffmpeg_process = None


def start_or_restart_ffmpeg(
    ffmpeg_cmd, logger, logpipe: LogPipe, frame_size=None, ffmpeg_process=None
) -> sp.Popen[Any]:
    if ffmpeg_process is not None:
        stop_ffmpeg(ffmpeg_process, logger)

    if frame_size is None:
        process = sp.Popen(
            ffmpeg_cmd,
            stdout=sp.DEVNULL,
            stderr=logpipe,
            stdin=sp.DEVNULL,
            start_new_session=True,
        )
    else:
        process = sp.Popen(
            ffmpeg_cmd,
            stdout=sp.PIPE,
            stderr=logpipe,
            stdin=sp.DEVNULL,
            bufsize=frame_size * 10,
            start_new_session=True,
        )
    return process


logger = logging.getLogger(__name__)


def inject_progress_flags(cmd: list[str]) -> list[str]:
    """Insert `-progress pipe:2 -nostats` immediately before the output path.

    `-progress pipe:2` writes structured key=value lines to stderr;
    `-nostats` suppresses the noisy default stats output. The output path
    is conventionally the last token in an FFmpeg argv.
    """
    if not cmd:
        return cmd
    return cmd[:-1] + ["-progress", "pipe:2", "-nostats", cmd[-1]]


def run_ffmpeg_with_progress(
    cmd: list[str],
    *,
    expected_duration_seconds: float,
    on_progress: Optional[Callable[[float], None]] = None,
    stdin_payload: Optional[str] = None,
    process_started: Optional[Callable[[sp.Popen], None]] = None,
    use_low_priority: bool = True,
) -> tuple[int, str]:
    """Run an ffmpeg command, streaming progress via `-progress pipe:2`.

    Args:
        cmd: ffmpeg argv. Output path must be the last token.
        expected_duration_seconds: Duration of the expected output clip in
            seconds. Used to convert ffmpeg's `out_time_us` into a percent.
        on_progress: Optional callback invoked with a percent in [0, 100].
            Called once with 0.0 at start, again on each `out_time_us=`
            stderr line, and once with 100.0 on `progress=end`.
        stdin_payload: Optional string written to ffmpeg stdin (used by
            export for concat playlists).
        process_started: Optional callback invoked with the live `Popen`
            once spawned — lets callers store the ref for cancellation.
        use_low_priority: When True, prepend `nice -n PROCESS_PRIORITY_LOW`
            so concat doesn't starve detection.

    Returns:
        Tuple of `(returncode, captured_stderr)`. Stdout is left attached
        to the parent process to avoid buffer-full deadlocks.
    """
    full_cmd = inject_progress_flags(cmd)
    if use_low_priority:
        full_cmd = ["nice", "-n", str(PROCESS_PRIORITY_LOW)] + full_cmd

    def emit(percent: float) -> None:
        if on_progress is None:
            return
        try:
            on_progress(max(0.0, min(100.0, percent)))
        except Exception:
            logger.exception("FFmpeg progress callback failed")

    emit(0.0)

    proc = sp.Popen(
        full_cmd,
        stdin=sp.PIPE if stdin_payload is not None else None,
        stderr=sp.PIPE,
        text=True,
        encoding="ascii",
        errors="replace",
    )
    if process_started is not None:
        try:
            process_started(proc)
        except Exception:
            logger.exception("FFmpeg process_started callback failed")

    if stdin_payload is not None and proc.stdin is not None:
        try:
            proc.stdin.write(stdin_payload)
        except (BrokenPipeError, OSError):
            pass
        finally:
            try:
                proc.stdin.close()
            except (BrokenPipeError, OSError):
                pass

    captured: list[str] = []
    if proc.stderr is not None:
        try:
            for raw_line in proc.stderr:
                captured.append(raw_line)
                line = raw_line.strip()
                if not line:
                    continue
                if line.startswith("out_time_us="):
                    if expected_duration_seconds <= 0:
                        continue
                    try:
                        out_time_us = int(line.split("=", 1)[1])
                    except (ValueError, IndexError):
                        continue
                    if out_time_us < 0:
                        continue
                    out_seconds = out_time_us / 1_000_000.0
                    emit((out_seconds / expected_duration_seconds) * 100.0)
                elif line == "progress=end":
                    emit(100.0)
                    break
        except Exception:
            logger.exception("Failed reading FFmpeg progress stream")

    proc.wait()

    if proc.stderr is not None:
        try:
            remaining = proc.stderr.read()
            if remaining:
                captured.append(remaining)
        except Exception:
            pass

    return proc.returncode or 0, "".join(captured)
