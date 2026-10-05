"""Utilities for creating and manipulating audio."""

import io
import logging
import os
import re
import string
import struct
import subprocess as sp
import wave

import numpy as np
from pathvalidate import sanitize_filename

from frigate.const import (
    AUDIO_SAMPLE_RATE,
    CACHE_DIR,
    STREAM_TYPE_MAIN,
    STREAM_TYPE_SUB,
)
from frigate.models import Recordings

logger = logging.getLogger(__name__)

# Ceiling on the run of words the stitcher will treat as an overlap between two
# consecutive windows. This is an audio-duration bound, not a linguistic one: a
# window holds GENAI_WINDOW_CHUNKS * AUDIO_DURATION seconds of speech, so at a
# fast talker's pace it tops out around this many words, and a whole window can
# legitimately be redundant. The vendored whisper_streaming HypothesisBuffer
# caps at 5, but there the n-gram is only a tie-break on top of word-level
# timestamps; here it is the entire alignment, so 5 truncates real overlaps.
# Sentinel meaning "let the model work out the language". The vendored
# whisper_streaming code already uses this spelling, so it is the established
# convention for the audio_transcription.language field.
AUTO_LANGUAGE = "auto"

MAX_STITCH_NGRAM = 16

# How many trailing committed words the stitcher may discard to find an
# alignment. Those words came from the newest audio, which the next window
# re-covers, so when the provider got one of them wrong it blocks every
# alignment and the whole phrase duplicates. Set to 0 to make committed text
# strictly append-only.
MAX_STITCH_REVISE = 3

# A revision deletes text that was already published, so it has to clear a
# higher bar than a plain append: a single coincidentally shared word is not
# enough evidence to throw committed words away.
MIN_STITCH_REVISE_RUN = 2

# ASR models often wrap their output in control markup. Qwen3-ASR, for example,
# answers "language English<asr_text>Yeah, that works." A structural opening tag
# marks where the transcript starts, so anything before the last one is metadata.
# Closing tags (</x>) and pipe-delimited special tokens (<|endoftext|>) are
# excluded: those mark where the text ends, so text before them must be kept.
_OPENING_TAG = re.compile(r"<(?![/|])[^<>]*>")
_ANY_TAG = re.compile(r"<[^<>]*>")


def _get_recordings_for_range(
    camera_name: str, start_ts: float, end_ts: float, stream_type: str
) -> list[Recordings]:
    """Fetch one stream type's recording rows overlapping the requested range."""
    return list(
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
        .where(Recordings.stream_type == stream_type)
        .order_by(Recordings.start_time.asc())
    )


def get_audio_from_recording(
    ffmpeg,
    camera_name: str,
    start_ts: float,
    end_ts: float,
    sample_rate: int = 16000,
) -> bytes | None:
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
    # Fetch all relevant recording segments; never mix streams in one
    # concat, so prefer main and fall back to sub for expired-main history
    recordings = _get_recordings_for_range(
        camera_name, start_ts, end_ts, STREAM_TYPE_MAIN
    )

    if not recordings:
        recordings = _get_recordings_for_range(
            camera_name, start_ts, end_ts, STREAM_TYPE_SUB
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
            # ffmpeg writes to a pipe, so it cannot seek back to patch the chunk
            # sizes it reserved; repair them before any strict consumer sees them
            return fix_wav_header(process.stdout)
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


def fix_wav_header(data: bytes) -> bytes:
    """Recompute the RIFF and data chunk sizes in a WAV header.

    ffmpeg writing to a non-seekable pipe cannot go back and patch the sizes it
    reserved, so it leaves 0xFFFFFFFF placeholders. PyAV-based demuxers ignore
    them, but strict validators may reject the file or read zero frames.

    Args:
        data: The complete WAV payload

    Returns:
        The payload with both sizes corrected, or unchanged if it is not a
        parseable RIFF/WAVE stream
    """
    if len(data) < 12 or data[0:4] != b"RIFF" or data[8:12] != b"WAVE":
        return data

    out = bytearray(data)

    # RIFF size covers everything after the 8-byte RIFF header
    struct.pack_into("<I", out, 4, len(out) - 8)

    # walk the chunk list to find "data"; every chunk is padded to even length
    pos = 12

    while pos + 8 <= len(out):
        chunk_id = bytes(out[pos : pos + 4])
        (chunk_size,) = struct.unpack_from("<I", out, pos + 4)

        if chunk_id == b"data":
            struct.pack_into("<I", out, pos + 4, len(out) - (pos + 8))
            return bytes(out)

        if chunk_size == 0xFFFFFFFF:
            # an unpatched size before the data chunk leaves nothing to walk
            break

        pos += 8 + chunk_size + (chunk_size % 2)

    return bytes(out)


def pcm16_to_wav(samples: np.ndarray, sample_rate: int = AUDIO_SAMPLE_RATE) -> bytes:
    """Wrap mono int16 PCM samples in a WAV container.

    Args:
        samples: The audio samples; converted to int16 if they are not already
        sample_rate: Sample rate to declare in the header

    Returns:
        WAV bytes suitable for upload to a GenAI provider
    """
    if samples.dtype != np.int16:
        samples = samples.astype(np.int16)

    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(samples.tobytes())

    return buffer.getvalue()


def stitch_transcripts(committed: str, incoming: str) -> str:
    """Append *incoming* to *committed*, dropping the speech they share.

    Consecutive overlapped transcription windows re-transcribe the same audio at
    their seam, so the tail of one and the newest one name the same words. Find
    the longest run that is a suffix of *committed* and occurs anywhere in
    *incoming*, then keep only what follows that run.

    Searching all of *incoming* rather than just its start is what makes this
    work in practice. The provider re-transcribes the shared audio independently
    and often gets its first word or two different ("just gonna" one window,
    "It's gonna" the next), which leaves the real overlap sitting in the middle
    of *incoming*. A prefix-anchored match sees no overlap at all there and
    duplicates the entire phrase.

    Text-level rather than timestamp-level because only some providers return
    word timings, and this has to work across all of them.

    Args:
        committed: The transcript accumulated so far
        incoming: The newest window's transcript

    Returns:
        The combined transcript
    """
    incoming_words = incoming.split()

    if not incoming_words:
        return committed

    committed_words = committed.split()

    if not committed_words:
        return " ".join(incoming_words)

    committed_keys = [_overlap_key(word) for word in committed_words]
    incoming_keys = [_overlap_key(word) for word in incoming_words]

    length, consumed = _find_overlap(committed_keys, incoming_keys)

    if length:
        return " ".join(committed_words + incoming_words[consumed:])

    # Nothing aligns. Retry against a shortened committed tail: a single word the
    # provider got wrong at the end of the previous window otherwise blocks every
    # alignment, and the entire re-transcribed phrase duplicates behind it.
    best: tuple[int, int, int] | None = None

    for drop in range(1, min(MAX_STITCH_REVISE, len(committed_keys) - 1) + 1):
        length, consumed = _find_overlap(committed_keys[:-drop], incoming_keys)

        if length < MIN_STITCH_REVISE_RUN:
            continue

        # longest run wins; ties go to the smallest revision
        if best is None or length > best[0]:
            best = (length, drop, consumed)

    if best is None:
        return " ".join(committed_words + incoming_words)

    _, drop, consumed = best

    return " ".join(committed_words[:-drop] + incoming_words[consumed:])


def _find_overlap(
    committed_keys: list[str], incoming_keys: list[str]
) -> tuple[int, int]:
    """Locate the speech *incoming* shares with the end of *committed*.

    Returns the length of the longest run that is a suffix of *committed_keys*
    and occurs anywhere in *incoming_keys*, along with the index just past that
    run in *incoming_keys*. Returns ``(0, 0)`` when nothing matches.

    Prefers the longest run so a real overlap is not cut short, and within one
    length the earliest position, so a phrase genuinely spoken twice keeps its
    second utterance.
    """
    max_run = min(MAX_STITCH_NGRAM, len(committed_keys), len(incoming_keys))

    for length in range(max_run, 0, -1):
        tail = committed_keys[-length:]

        for start in range(len(incoming_keys) - length + 1):
            if incoming_keys[start : start + length] == tail:
                return length, start + length

    return 0, 0


def clean_transcript(text: str | None) -> str:
    """Strip provider control markup and any preamble from a raw transcript.

    A window with no speech often still comes back as the preamble alone
    ("language English<asr_text>"), which must reduce to an empty string so
    callers treat it as silence rather than committing it as spoken words.

    Args:
        text: The provider's raw response

    Returns:
        The transcript with markup removed and whitespace collapsed
    """
    if not text:
        return ""

    # everything up to and including the last opening tag is metadata
    openings = list(_OPENING_TAG.finditer(text))

    if openings:
        text = text[openings[-1].end() :]

    # drop closing tags and special tokens wherever they landed
    text = _ANY_TAG.sub(" ", text)

    return " ".join(text.split())


def _overlap_key(word: str) -> str:
    """Comparison key for overlap matching.

    Providers re-transcribe the shared audio at a window seam independently, so
    the same word routinely comes back capitalized differently or with different
    edge punctuation ("work." vs "Work"). Those differences must not defeat the
    match, but the original spelling is what gets kept in the output.
    """
    key = word.strip(string.punctuation).casefold()

    # a token that is nothing but punctuation would otherwise match any other
    return key or word


def resolve_language(language: str | None) -> str | None:
    """Turn a configured language into an explicit code, or None for auto-detect.

    Args:
        language: The configured value, possibly AUTO_LANGUAGE

    Returns:
        An ISO language code, or None when the backend should detect it
    """
    if not language or language == AUTO_LANGUAGE:
        return None

    return language
