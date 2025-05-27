"""Utilities for creating and manipulating audio."""

import logging
import os
import subprocess as sp
from typing import Optional

from pathvalidate import sanitize_filename

from frigate.const import CACHE_DIR
from frigate.models import Recordings

logger = logging.getLogger(__name__)


def get_audio_from_recording(
    ffmpeg,
    camera_name: str,
    start_ts: float,
    end_ts: float,
    sample_rate: int = 16000,
) -> Optional[bytes]:
    """Extract audio from recording files between start_ts and end_ts in WAV format suitable for sherpa-onnx.

    Args:
        ffmpeg: FFmpeg configuration object
        camera_name: Name of the camera
        start_ts: Start timestamp in seconds
        end_ts: End timestamp in seconds
        sample_rate: Sample rate for output audio (default 16kHz for sherpa-onnx)

    Returns:
        Bytes of WAV audio data or None if extraction failed
    """
    # Fetch all relevant recording segments
    recordings = (
        Recordings.select(
            Recordings.path,
            Recordings.start_time,
            Recordings.end_time,
        )
        .where(
            (Recordings.start_time.between(start_ts, end_ts))
            | (Recordings.end_time.between(start_ts, end_ts))
            | ((start_ts > Recordings.start_time) & (end_ts < Recordings.end_time))
        )
        .where(Recordings.camera == camera_name)
        .order_by(Recordings.start_time.asc())
    )

    if not recordings:
        logger.debug(
            f"No recordings found for {camera_name} between {start_ts} and {end_ts}"
        )
        return None

    # Generate concat playlist file
    file_name = sanitize_filename(
        f"audio_playlist_{camera_name}_{start_ts}-{end_ts}.txt"
    )
    file_path = os.path.join(CACHE_DIR, file_name)
    try:
        with open(file_path, "w") as file:
            for clip in recordings:
                file.write(f"file '{clip.path}'\n")
                if clip.start_time < start_ts:
                    file.write(f"inpoint {int(start_ts - clip.start_time)}\n")
                if clip.end_time > end_ts:
                    file.write(f"outpoint {int(end_ts - clip.start_time)}\n")

        ffmpeg_cmd = [
            ffmpeg.ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "warning",
            "-protocol_whitelist",
            "pipe,file",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            file_path,
            "-vn",  # No video
            "-acodec",
            "pcm_s16le",  # 16-bit PCM encoding
            "-ar",
            str(sample_rate),
            "-ac",
            "1",  # Mono audio
            "-f",
            "wav",
            "-",
        ]

        process = sp.run(
            ffmpeg_cmd,
            capture_output=True,
        )

        if process.returncode == 0:
            logger.debug(
                f"Successfully extracted audio for {camera_name} from {start_ts} to {end_ts}"
            )
            return process.stdout
        else:
            logger.error(f"Failed to extract audio: {process.stderr.decode()}")
            return None
    except Exception as e:
        logger.error(f"Error extracting audio from recordings: {e}")
        return None
    finally:
        try:
            os.unlink(file_path)
        except OSError:
            pass
