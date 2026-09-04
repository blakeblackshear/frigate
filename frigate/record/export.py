"""Export recordings to storage."""

import asyncio
import datetime
import logging
import os
import random
import re
import shutil
import string
import subprocess as sp
import threading
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

import pytz  # type: ignore[import-untyped]
from pathvalidate import sanitize_filename
from peewee import DoesNotExist

from frigate.config import FfmpegConfig, FrigateConfig
from frigate.config.camera.record import ChaptersEnum
from frigate.const import (
    CACHE_DIR,
    CLIPS_DIR,
    EXPORT_DIR,
    MAX_PLAYLIST_SECONDS,
    PREVIEW_FRAME_TYPE,
    STREAM_TYPE_MAIN,
    STREAM_TYPE_SUB,
)
from frigate.ffmpeg_presets import (
    EncodeTypeEnum,
    parse_preset_hardware_acceleration_encode,
)
from frigate.models import Export, Previews, Recordings, ReviewSegment
from frigate.util.ffmpeg import run_ffmpeg_with_progress
from frigate.util.ownership import chown_to_runtime
from frigate.util.recording_coverage import (
    build_spans,
    known_video_codecs,
    resolve_coverage,
    stream_media_summary,
)
from frigate.util.services import get_video_properties
from frigate.util.time import is_current_hour

logger = logging.getLogger(__name__)


DEFAULT_TIME_LAPSE_FFMPEG_ARGS = "-vf setpts=0.04*PTS -r 30"
TIMELAPSE_DATA_INPUT_ARGS = "-an -skip_frame nokey"

# nginx-vod repackages each stream into fMP4 with a timescale derived from
# that stream's frame rate, and the concat demuxer rescales every input to
# whatever timebase the first one happens to use. Staging each run with one
# explicit timescale is what keeps a 5fps sub run from being replayed at the
# main stream's rate. 90000 is the RTSP clock rate and divides evenly by
# every common camera frame rate.
EXPORT_TRACK_TIMESCALE = 90000


@dataclass
class StreamRun:
    """A contiguous slice of an export served by a single stream type.

    sample_path is one recording from the run, used to probe the stream's
    resolution when the runs have to be scaled to a common size.
    """

    stream_type: str
    start_time: float
    end_time: float
    sample_path: str

    @property
    def duration(self) -> float:
        return max(0.0, self.end_time - self.start_time)


@dataclass
class _ChapterWindow:
    """A merged-timeline slice, shaped like the recording rows chapters read."""

    start_time: float
    end_time: float


# Matches the setpts factor used in timelapse exports (e.g. setpts=0.04*PTS).
# Captures the floating-point factor so we can scale expected duration.
SETPTS_FACTOR_RE = re.compile(r"setpts=([0-9]*\.?[0-9]+)\*PTS")

# Allowlisted flags that take no value.
_VALUELESS_FLAGS = frozenset({"-an", "-sn", "-dn"})

# Allowlisted filter flags. Their value is validated as a filtergraph and may
# only reference filters in _SAFE_FILTERS.
_FILTER_FLAGS = frozenset({"-vf", "-af", "-filter"})

# Allowlisted flags that take exactly one value (encoder / muxer-safe options).
_VALUE_FLAGS = frozenset(
    {
        "-c",
        "-codec",
        "-b",
        "-crf",
        "-qp",
        "-q",
        "-qscale",
        "-preset",
        "-tune",
        "-profile",
        "-level",
        "-pix_fmt",
        "-r",
        "-g",
        "-keyint_min",
        "-sc_threshold",
        "-bf",
        "-refs",
        "-qmin",
        "-qmax",
        "-maxrate",
        "-minrate",
        "-bufsize",
        "-movflags",
        "-threads",
        "-aspect",
        "-fps_mode",
        "-vsync",
        "-skip_frame",
    }
)

_ALLOWED_FLAGS = _VALUELESS_FLAGS | _FILTER_FLAGS | _VALUE_FLAGS

# Filters that cannot read files, load plugins, or open network sources.
_SAFE_FILTERS = frozenset(
    {
        "setpts",
        "fps",
        "scale",
        "format",
        "transpose",
        "hflip",
        "vflip",
        "crop",
        "pad",
        "setsar",
        "setdar",
    }
)

# Conservative shape for a non-filter flag value. Excludes "/" (paths /
# filtergraph division), whitespace, brackets, and a leading "-" so a value
# can never be a path or swallow a following flag. ":" is permitted for values
# like "16:9".
_SAFE_VALUE_RE = re.compile(r"^[A-Za-z0-9_.:+][A-Za-z0-9_.:+-]*$")

# Substrings inside a filtergraph that indicate a file-reading filter option.
# "movie=" also matches "amovie=" as a substring.
_BLOCKED_FILTER_VALUE_MARKERS = ("movie=", "textfile=", "filename=", "fontfile=")


def _base_flag(token: str) -> str:
    """Return a flag's base name, lowercased and without its stream specifier.

    e.g. "-c:v" -> "-c", "-filter:a:0" -> "-filter".
    """
    return token.lower().split(":", 1)[0]


def _validate_filtergraph(value: str) -> tuple[bool, str]:
    """Validate a filtergraph value, allowing only filters in _SAFE_FILTERS."""
    # None of the safe filters need any of these
    if any(token in value for token in ("://", "..", "[", "]")):
        return False, "Invalid filter graph in custom ffmpeg arguments"

    lowered = value.lower()
    if any(marker in lowered for marker in _BLOCKED_FILTER_VALUE_MARKERS):
        return False, "File-reading filters are not allowed in custom ffmpeg arguments"

    # Filters are separated by "," within a chain and ";" between chains. Safe
    # filters never use unescaped "," or ";" in their arguments, so splitting on
    # them to recover filter names cannot hide a disallowed filter.
    for spec in re.split(r"[;,]", value):
        spec = spec.strip()
        if not spec:
            continue

        name = spec.split("=", 1)[0].strip().lower()
        if name not in _SAFE_FILTERS:
            return False, f"Filter not allowed in custom ffmpeg arguments: {name}"

    return True, ""


def validate_ffmpeg_args(args: str) -> tuple[bool, str]:
    """Validate user-provided custom export ffmpeg args with an allowlist.

    Every token must be an allowlisted flag or the value of one; filter values
    may only reference safe filters; and no token may become a bare input or
    output URL. This structurally prevents arbitrary file read/write, network
    exfiltration/SSRF, and resource-exhaustion via the export endpoint.

    Admin users skip this validation entirely since they are trusted.
    """
    if not args or not args.strip():
        return True, ""

    tokens = args.split()
    i = 0
    while i < len(tokens):
        token = tokens[i]

        # A bare (non-flag) token here would be parsed by ffmpeg as an input or
        # output URL. Only the server sets inputs/outputs, never the user.
        if not token.startswith("-"):
            return False, f"Unexpected argument in custom ffmpeg arguments: {token}"

        base = _base_flag(token)
        if base not in _ALLOWED_FLAGS:
            return False, f"Forbidden ffmpeg argument: {token}"

        if base in _VALUELESS_FLAGS:
            i += 1
            continue

        # Remaining flags consume exactly one value.
        if i + 1 >= len(tokens):
            return False, f"Missing value for ffmpeg argument: {token}"

        value = tokens[i + 1]
        if base in _FILTER_FLAGS:
            valid, message = _validate_filtergraph(value)
            if not valid:
                return False, message
        elif not _SAFE_VALUE_RE.match(value):
            return False, f"Invalid value for {token}: {value}"

        i += 2

    return True, ""


class PlaybackSourceEnum(str, Enum):
    recordings = "recordings"
    preview = "preview"


class ExportStreamEnum(str, Enum):
    """Which recorded stream an export should be built from.

    ``auto`` keeps the merged timeline: main where it exists, sub filling
    the gaps main has already aged out of. Pinning to one stream trades
    that coverage for a uniform source, which is always a plain stream
    copy since nothing hands off mid-export.
    """

    auto = "auto"
    main = STREAM_TYPE_MAIN
    sub = STREAM_TYPE_SUB


EXPORT_FILE_NAME_MAX_BYTES = 255


def export_video_path(name: str, export_id: str) -> str:
    """Path an export's video is stored at once the user has named it.

    The id suffix keeps the path unique when two exports share a name, and
    keeps the result a single path component whatever the user typed.
    """
    suffix = f"_{export_id.split('_')[-1]}.mp4"
    budget = EXPORT_FILE_NAME_MAX_BYTES - len(suffix.encode())
    stem = sanitize_filename(name).encode()[:budget].decode(errors="ignore")

    return os.path.join(EXPORT_DIR, f"{stem.strip('. ') or 'export'}{suffix}")


class RecordingExporter(threading.Thread):
    """Exports a specific set of recordings for a camera to storage as a single file."""

    def __init__(
        self,
        config: FrigateConfig,
        id: str,
        camera: str,
        name: str | None,
        image: str | None,
        start_time: int,
        end_time: int,
        playback_source: PlaybackSourceEnum,
        export_case_id: str | None = None,
        ffmpeg_input_args: str | None = None,
        ffmpeg_output_args: str | None = None,
        cpu_fallback: bool = False,
        chapters: ChaptersEnum | None = None,
        stream: ExportStreamEnum = ExportStreamEnum.auto,
        on_progress: Callable[[str, float], None] | None = None,
    ) -> None:
        super().__init__()
        self.config = config
        self.export_id = id
        self.camera = camera
        self.user_provided_name = name
        self.user_provided_image = image
        self.start_time = start_time
        self.end_time = end_time
        self.playback_source = playback_source
        self.export_case_id = export_case_id
        self.ffmpeg_input_args = ffmpeg_input_args
        self.ffmpeg_output_args = ffmpeg_output_args
        self.cpu_fallback = cpu_fallback
        self.chapters = chapters
        self.stream = stream
        self.on_progress = on_progress
        self.staged_runs: list[str] = []
        self._coverage: tuple[list[list[Any]], set[str], bool] | None = None

        # ensure export thumb dir
        Path(os.path.join(CLIPS_DIR, "export")).mkdir(exist_ok=True)

    def _emit_progress(self, step: str, percent: float) -> None:
        """Invoke the progress callback if one was supplied."""
        if self.on_progress is None:
            return
        try:
            self.on_progress(step, max(0.0, min(100.0, percent)))
        except Exception:
            logger.exception("Export progress callback failed")

    def _expected_output_duration_seconds(self) -> float:
        """Compute the expected duration of the output video in seconds.

        Users often request a wide time range (e.g. a full hour) when only
        a few minutes of recordings actually live on disk for that span,
        so the requested range overstates the work and progress would
        plateau very early. We sum the actual saved seconds from the
        Recordings/Previews tables and use that as the input duration.
        Timelapse exports then scale this by the setpts factor.
        """
        requested_duration = max(0.0, float(self.end_time - self.start_time))

        recorded = self._sum_source_duration_seconds()
        input_duration = (
            recorded if recorded is not None and recorded > 0 else requested_duration
        )

        if not self.ffmpeg_output_args:
            return input_duration

        match = SETPTS_FACTOR_RE.search(self.ffmpeg_output_args)
        if match is None:
            return input_duration

        try:
            factor = float(match.group(1))
        except ValueError:
            return input_duration

        if factor <= 0:
            return input_duration

        return input_duration * factor

    @property
    def pinned_stream(self) -> str | None:
        """The stream type this export is pinned to, or None for auto."""
        return None if self.stream == ExportStreamEnum.auto else self.stream.value

    def _resolve_coverage(self) -> tuple[list[list[Any]], set[str], bool]:
        """Resolve the export range into the spans the VOD manifest will serve.

        Delegates to the same coverage resolution the manifest builder
        uses, so what we plan around and what nginx-vod emits agree by
        construction. Returns the spans (each [row, start, end, is_main]),
        the known video codecs, and whether audio survives the range.
        Memoized: several stages of the export ask the same question, and
        the recordings backing a finished range do not change under us.
        """
        if self._coverage is None:
            intervals = resolve_coverage(self.camera, self.start_time, self.end_time)
            self._coverage = (
                build_spans(intervals, self.pinned_stream),
                known_video_codecs(intervals),
                self._audio_is_uniform(stream_media_summary(intervals)),
            )

        return self._coverage

    def _audio_is_uniform(self, summary: dict[str, dict[str, Any]]) -> bool:
        """Whether every stream in range carries audio with the same signature.

        Stream-copying audio across a hand-off only works when both
        streams agree, the same rule the merged manifest applies when it
        decides to serve a mixed range without audio.
        """
        # legacy rows report None rather than False, and an unknown
        # signature is not one we can promise lines up
        if not summary or any(
            stream["has_audio"] is not True for stream in summary.values()
        ):
            return False

        return (
            len(
                {
                    (stream["audio_codec"], stream["audio_rate"])
                    for stream in summary.values()
                }
            )
            == 1
        )

    def _merged_spans(self) -> list[list[Any]]:
        return self._resolve_coverage()[0]

    def _prepare_stream_runs(self) -> bool:
        """Stage each stream run to a temp file when the range spans more than one.

        Leaves ``staged_runs`` empty for a single-stream range, which is
        the overwhelmingly common case and keeps the existing
        single-playlist path byte for byte what it was. Returns False only
        when staging was needed and failed.
        """
        if self.pinned_stream is not None:
            # a pinned range is uniform by construction, so there is no
            # hand-off to stage around
            return True

        spans, codecs, keep_audio = self._resolve_coverage()
        runs = self._stream_runs(spans)

        # a range one stream covers end to end has nothing to hand off,
        # so it stays on the existing path however long it is
        if len(runs) < 2:
            return True

        runs = [piece for run in runs for piece in self._split_long_run(run)]
        return self._stage_stream_runs(runs, codecs, keep_audio)

    def _stream_runs(self, spans: list[list[Any]]) -> list[StreamRun]:
        """Collapse the merged spans into contiguous runs of one stream type.

        A run is the largest slice of the export that a single stream
        covers end to end, and is therefore the largest chunk we can hand
        to ffmpeg without the parameter sets changing underneath it.
        """
        runs: list[StreamRun] = []

        for row, span_start, span_end, is_main in spans:
            stream_type = STREAM_TYPE_MAIN if is_main else STREAM_TYPE_SUB

            if runs and runs[-1].stream_type == stream_type:
                runs[-1].end_time = span_end
            else:
                runs.append(StreamRun(stream_type, span_start, span_end, row.path))

        return runs

    def _split_long_run(self, run: StreamRun) -> list[StreamRun]:
        """Break a run into playlist-sized pieces.

        Each run is fetched as one pinned VOD playlist, and nginx-vod caps
        how many clips a single mapping may hold. This is the same bound
        the unstaged path respects by paging its playlist lines. Splitting
        is free here: both halves are the same stream, so they share the
        parameter sets and the timebase.
        """
        if run.duration <= MAX_PLAYLIST_SECONDS:
            return [run]

        pieces: list[StreamRun] = []
        start = run.start_time

        while start < run.end_time:
            end = min(start + MAX_PLAYLIST_SECONDS, run.end_time)
            pieces.append(StreamRun(run.stream_type, start, end, run.sample_path))
            start = end

        return pieces

    def _internal_port(self) -> int:
        """The API port to fetch VOD playlists from."""
        internal_port = self.config.networking.listen.internal

        # handle case where internal port is a string with ip:port
        if type(internal_port) is str:
            return int(internal_port.split(":")[-1])

        return internal_port

    def _vod_url(self, stream_type: str | None, start: float, end: float) -> str:
        """A VOD playlist URL, pinned to one stream type when given."""
        pin = f"/{stream_type}" if stream_type else ""
        return (
            f"http://127.0.0.1:{self._internal_port()}/vod/{self.camera}{pin}"
            f"/start/{start}/end/{end}/index.m3u8"
        )

    def _staged_run_path(self, index: int) -> str:
        return os.path.join(CACHE_DIR, f"export_stage_{self.export_id}_{index}.mp4")

    def _probe_stream_resolution(self, run: StreamRun) -> tuple[int, int] | None:
        """Probe one recording from a run for its resolution.

        Only the scaling path needs this, and one segment per stream is
        enough: a stream's resolution is fixed for as long as the camera
        keeps its configuration.
        """
        try:
            properties = asyncio.run(
                get_video_properties(self.config.ffmpeg, run.sample_path)
            )
        except OSError:
            logger.exception("Failed to probe %s for export sizing", run.sample_path)
            return None

        width = properties.get("width")
        height = properties.get("height")

        if not width or not height:
            return None

        return int(width), int(height)

    def _stage_run_command(
        self,
        run: StreamRun,
        dest: str,
        target: tuple[int, int] | None,
        keep_audio: bool,
    ) -> list[str]:
        """Build the ffmpeg command that renders one run to a temp file.

        Without a target the run is stream-copied, which is all a mixed
        *resolution* export needs. A target is only set when the runs also
        disagree on codec, where one mp4 track genuinely cannot hold both
        and every run has to be re-encoded to match.
        """
        ffmpeg_input = (
            "-y -protocol_whitelist pipe,file,http,tcp "
            f"-i {self._vod_url(run.stream_type, run.start_time, run.end_time)}"
        )
        # audio only survives when both streams agree on it, otherwise the
        # copied track breaks at the same hand-off the video used to. These
        # are output options: "-c:a copy" ahead of -i selects a *decoder*
        # named copy, which does not exist
        audio_args = "-c:a copy" if keep_audio else "-an"

        if target is None:
            return (
                f"{self.config.ffmpeg.ffmpeg_path} -hide_banner {ffmpeg_input} "
                f"{audio_args} -c:v copy "
                f"-video_track_timescale {EXPORT_TRACK_TIMESCALE} {dest}"
            ).split(" ")

        width, height = target
        # pad rather than stretch: the sub stream is often a different
        # aspect ratio than the main one, and letterboxing it is honest
        # where distorting the footage is not
        scale = (
            f"scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1"
        )
        # deliberately software-encoded. The vaapi and nvidia encode presets
        # set -hwaccel_output_format, which leaves decoded frames in GPU
        # memory where scale/pad cannot reach them; making this pass use the
        # GPU means per-preset hwdownload/hwupload chains (see the birdseye
        # vaapi preset). Codec-mixed ranges are rare enough to eat the CPU
        # cost rather than ship an untested filter graph
        return parse_preset_hardware_acceleration_encode(
            self.config.ffmpeg.ffmpeg_path,
            None,
            ffmpeg_input,
            f"{audio_args} -vf {scale} "
            f"-video_track_timescale {EXPORT_TRACK_TIMESCALE} {dest}",
            EncodeTypeEnum.timelapse,
        ).split(" ")

    def _stage_stream_runs(
        self,
        runs: list[StreamRun],
        codecs: set[str],
        keep_audio: bool,
    ) -> bool:
        """Render each run to its own temp file, one stream type at a time.

        This is what makes a mixed-resolution export work. Handing the
        merged playlist straight to ffmpeg looks like it should work,
        since nginx-vod marks the stream change with a discontinuity and a
        fresh EXT-X-MAP, but ffmpeg's HLS demuxer binds the track's
        parameter sets from the *first* init segment only. Every sample
        after the hand-off is then decoded against the wrong SPS, which is
        what freezes the sub-resolution stretches of the output.

        Demuxing each run on its own gives each one its correct parameter
        sets, and the mp4 muxer writes them in-band at the hand-off, so
        the concatenated result decodes cleanly without re-encoding.

        Returns False when staging failed. The caller must abort rather
        than fall back to the merged playlist, which is the very thing
        that produces the broken file.
        """
        target: tuple[int, int] | None = None

        if len(codecs) > 1:
            # one mp4 track carries one codec, so a range that mixes them
            # has to be re-encoded to a common one. Scale up to the
            # largest stream so the main footage keeps its detail
            sizes = [
                size
                for size in (self._probe_stream_resolution(run) for run in runs)
                if size is not None
            ]

            if not sizes:
                logger.error(
                    "Export %s spans video codecs %s but no run could be probed "
                    "for its resolution",
                    self.export_id,
                    sorted(codecs),
                )
                return False

            target = (max(s[0] for s in sizes), max(s[1] for s in sizes))
            logger.debug(
                "Export %s spans video codecs %s; re-encoding every run to %dx%d",
                self.export_id,
                sorted(codecs),
                target[0],
                target[1],
            )
        else:
            logger.debug(
                "Export %s spans %d stream runs; staging each one separately",
                self.export_id,
                len(runs),
            )

        total_duration = sum(run.duration for run in runs) or 1.0
        step = "encoding" if target is not None else "copying"
        completed = 0.0

        for index, run in enumerate(runs):
            dest = self._staged_run_path(index)
            weight = 100.0 * run.duration / total_duration
            base = 100.0 * completed / total_duration

            returncode, stderr = run_ffmpeg_with_progress(
                self._stage_run_command(run, dest, target, keep_audio),
                expected_duration_seconds=run.duration,
                on_progress=lambda percent, base=base, weight=weight: (
                    self._emit_progress(step, base + (percent / 100.0) * weight)
                ),
                use_low_priority=True,
            )

            if returncode != 0:
                logger.error(
                    "Failed to stage %s stream for export %s between %s and %s",
                    run.stream_type,
                    self.export_id,
                    run.start_time,
                    run.end_time,
                )
                logger.error(stderr)
                self._cleanup_staged_runs()
                return False

            self.staged_runs.append(dest)
            completed += run.duration

        return True

    def _cleanup_staged_runs(self) -> None:
        """Remove any temp files left behind by staging."""
        for path in self.staged_runs:
            Path(path).unlink(missing_ok=True)

        self.staged_runs = []

    def _get_recordings_for_range(self, stream_type: str) -> list[Any]:
        """Fetch one stream type's recording rows overlapping the export range."""
        return list(
            Recordings.select(
                Recordings.start_time,
                Recordings.end_time,
            )
            .where(
                Recordings.start_time.between(self.start_time, self.end_time)
                | Recordings.end_time.between(self.start_time, self.end_time)
                | (
                    (self.start_time > Recordings.start_time)
                    & (self.end_time < Recordings.end_time)
                )
            )
            .where(
                (Recordings.camera == self.camera)
                & (Recordings.stream_type == stream_type)
            )
            .order_by(Recordings.start_time.asc())
            .iterator()
        )

    def _sum_source_duration_seconds(self) -> float | None:
        """Sum saved-video seconds inside [start_time, end_time].

        Queries Recordings or Previews depending on the playback source,
        clamps each segment to the requested range, and returns the total.
        Returns ``None`` on any error so the caller can fall back to the
        requested range duration without losing progress reporting.
        """
        try:
            if self.playback_source == PlaybackSourceEnum.recordings:
                # the merged timeline is what actually gets exported: main
                # where it exists, sub filling the gaps it leaves behind.
                # Summing one stream alone under-reports a mixed range and
                # pins progress at 100% for the rest of the export
                return sum(
                    max(0.0, span_end - span_start)
                    for _row, span_start, span_end, _is_main in self._merged_spans()
                )
            else:
                rows = (
                    Previews.select(Previews.start_time, Previews.end_time)
                    .where(
                        Previews.start_time.between(self.start_time, self.end_time)
                        | Previews.end_time.between(self.start_time, self.end_time)
                        | (
                            (self.start_time > Previews.start_time)
                            & (self.end_time < Previews.end_time)
                        )
                    )
                    .where(Previews.camera == self.camera)
                    .iterator()
                )
        except Exception:
            logger.exception(
                "Failed to sum source duration for export %s", self.export_id
            )
            return None

        total = 0.0
        try:
            for row in rows:
                clipped_start = max(float(row.start_time), float(self.start_time))
                clipped_end = min(float(row.end_time), float(self.end_time))
                if clipped_end > clipped_start:
                    total += clipped_end - clipped_start
        except Exception:
            logger.exception(
                "Failed to read recording rows for export %s", self.export_id
            )
            return None

        return total

    def _run_ffmpeg_with_progress(
        self,
        ffmpeg_cmd: list[str],
        playlist_lines: str | list[str],
        step: str = "encoding",
    ) -> tuple[int, str]:
        """Delegate to the shared helper, mapping percent → (step, percent).

        Returns ``(returncode, captured_stderr)``.
        """
        if isinstance(playlist_lines, list):
            stdin_payload = "\n".join(playlist_lines)
        else:
            stdin_payload = playlist_lines

        return run_ffmpeg_with_progress(
            ffmpeg_cmd,
            expected_duration_seconds=self._expected_output_duration_seconds(),
            on_progress=lambda percent: self._emit_progress(step, percent),
            stdin_payload=stdin_payload,
            use_low_priority=True,
        )

    def get_datetime_from_timestamp(self, timestamp: int) -> str:
        # return in iso format using the configured ui.timezone when set,
        # so the auto-generated export name reflects local time rather
        # than the container's UTC clock
        tz_name = self.config.ui.timezone
        if tz_name:
            try:
                tz = pytz.timezone(tz_name)
            except pytz.UnknownTimeZoneError:
                tz = None
            if tz is not None:
                return datetime.datetime.fromtimestamp(timestamp, tz=tz).strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
        return datetime.datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M:%S")

    def _chapter_metadata_path(self) -> str:
        return os.path.join(CACHE_DIR, f"export_chapters_{self.export_id}.txt")

    def _build_chapter_metadata_file(self, recordings: list) -> str | None:
        """Write an FFmpeg metadata file with chapters for review items in range.

        Chapter offsets are computed in *output time*: the VOD endpoint
        concatenates recording clips back-to-back, so wall-clock gaps
        between recordings collapse in the produced video. We walk the
        same recording rows that feed the playlist and convert each
        review item's wall-clock boundaries into output-time offsets.
        Returns ``None`` when there are no recordings, no review items,
        or any chapter would have zero output duration.
        """
        if not recordings:
            return None

        windows: list[tuple[float, float, float]] = []
        output_offset = 0.0
        for rec in recordings:
            clipped_start = max(float(rec.start_time), float(self.start_time))
            clipped_end = min(float(rec.end_time), float(self.end_time))
            if clipped_end <= clipped_start:
                continue
            windows.append((clipped_start, clipped_end, output_offset))
            output_offset += clipped_end - clipped_start

        if not windows:
            return None

        try:
            review_rows = list(
                ReviewSegment.select(
                    ReviewSegment.start_time,
                    ReviewSegment.end_time,
                    ReviewSegment.severity,
                    ReviewSegment.data,
                )
                .where(
                    ReviewSegment.start_time.between(self.start_time, self.end_time)
                    | ReviewSegment.end_time.between(self.start_time, self.end_time)
                    | (
                        (self.start_time > ReviewSegment.start_time)
                        & (self.end_time < ReviewSegment.end_time)
                    )
                )
                .where(ReviewSegment.camera == self.camera)
                .order_by(ReviewSegment.start_time.asc())
                .iterator()
            )
        except Exception:
            logger.exception(
                "Failed to query review segments for export %s", self.export_id
            )
            return None

        if not review_rows:
            return None

        total_output = windows[-1][2] + (windows[-1][1] - windows[-1][0])
        last_recorded_end = windows[-1][1]

        def wall_to_output(t: float) -> float:
            t = max(float(self.start_time), min(float(self.end_time), t))
            for w_start, w_end, w_offset in windows:
                if t < w_start:
                    return w_offset
                if t <= w_end:
                    return w_offset + (t - w_start)
            return total_output

        chapter_blocks: list[str] = []
        for review in review_rows:
            if review.start_time is None:
                continue
            # In-progress segments have a NULL end_time until the activity
            # closes; clamp to the last recorded second so the chapter never
            # extends past the actual video.
            review_end = (
                float(review.end_time)
                if review.end_time is not None
                else last_recorded_end
            )
            start_out = wall_to_output(float(review.start_time))
            end_out = wall_to_output(review_end)

            # Drop chapters that fall entirely in a recording gap, or are
            # too short to be navigable in a player.
            if end_out - start_out < 1.0:
                continue

            data = review.data or {}
            labels: list[str] = []
            for obj in data.get("objects") or []:
                label = str(obj).split("-")[0]
                if label and label not in labels:
                    labels.append(label)

            metadata = data.get("metadata") or {}
            title = metadata.get("title")

            if not title:
                title = str(review.severity).capitalize()

                if labels:
                    title = f"{title}: {', '.join(labels)}"

            chapter_blocks.append(
                "[CHAPTER]\n"
                "TIMEBASE=1/1000\n"
                f"START={int(start_out * 1000)}\n"
                f"END={int(end_out * 1000)}\n"
                f"title={title}"
            )

        if not chapter_blocks:
            return None

        meta_path = self._chapter_metadata_path()
        try:
            with open(meta_path, "w", encoding="utf-8") as f:
                f.write(";FFMETADATA1\n")
                f.write("\n".join(chapter_blocks))
                f.write("\n")
        except OSError:
            logger.exception(
                "Failed to write chapter metadata file for export %s", self.export_id
            )
            return None

        return meta_path

    def _build_recording_segment_chapter_metadata_file(
        self, recordings: list
    ) -> str | None:
        """Write an FFmpeg metadata file with one chapter per recording segment.

        Each chapter's title is the segment's wallclock start time in
        strict ISO 8601 form so a viewer can map any point in the
        export's playback timeline back to real-world time without
        OCR-ing a burnt-in timestamp. Chapter offsets are computed in
        *output time*: the VOD endpoint concatenates recording clips
        back-to-back, so wall-clock gaps between recordings collapse in
        the produced video. Returns ``None`` when there are no
        recordings or every segment is empty after clipping.
        """
        if not recordings:
            return None

        tz_name = self.config.ui.timezone
        tz: datetime.tzinfo | None = None
        if tz_name:
            try:
                tz = pytz.timezone(tz_name)
            except pytz.UnknownTimeZoneError:
                tz = None
        if tz is None:
            tz = datetime.UTC

        chapter_blocks: list[str] = []
        output_offset_ms = 0
        for rec in recordings:
            clipped_start = max(float(rec.start_time), float(self.start_time))
            clipped_end = min(float(rec.end_time), float(self.end_time))
            if clipped_end <= clipped_start:
                continue

            duration_ms = int(round((clipped_end - clipped_start) * 1000))
            if duration_ms <= 0:
                continue

            title = datetime.datetime.fromtimestamp(clipped_start, tz=tz).isoformat(
                timespec="seconds"
            )
            chapter_blocks.append(
                "[CHAPTER]\n"
                "TIMEBASE=1/1000\n"
                f"START={output_offset_ms}\n"
                f"END={output_offset_ms + duration_ms}\n"
                f"title={title}"
            )
            output_offset_ms += duration_ms

        if not chapter_blocks:
            return None

        meta_path = self._chapter_metadata_path()
        try:
            with open(meta_path, "w", encoding="utf-8") as f:
                f.write(";FFMETADATA1\n")
                f.write("\n".join(chapter_blocks))
                f.write("\n")
        except OSError:
            logger.exception(
                "Failed to write chapter metadata file for export %s", self.export_id
            )
            return None

        return meta_path

    def save_thumbnail(self, id: str) -> str:
        thumb_path = os.path.join(CLIPS_DIR, f"export/{id}.webp")

        if self.user_provided_image is not None and os.path.isfile(
            self.user_provided_image
        ):
            shutil.copy(self.user_provided_image, thumb_path)
            return thumb_path

        if (
            self.start_time
            < datetime.datetime.now(datetime.UTC)
            .replace(minute=0, second=0, microsecond=0)
            .timestamp()
        ):
            # has preview mp4
            try:
                preview = (
                    Previews.select(
                        Previews.camera,
                        Previews.path,
                        Previews.duration,
                        Previews.start_time,
                        Previews.end_time,
                    )
                    .where(
                        Previews.start_time.between(self.start_time, self.end_time)
                        | Previews.end_time.between(self.start_time, self.end_time)
                        | (
                            (self.start_time > Previews.start_time)
                            & (self.end_time < Previews.end_time)
                        )
                    )
                    .where(Previews.camera == self.camera)
                    .limit(1)
                    .get()
                )
            except DoesNotExist:
                return ""

            diff = max(0.0, float(self.start_time) - float(preview.start_time))
            ffmpeg_cmd = [
                "/usr/lib/ffmpeg/8.0/bin/ffmpeg",  # hardcode path for exports thumbnail due to missing libwebp support
                "-hide_banner",
                "-loglevel",
                "warning",
                "-ss",
                f"{diff:.3f}",
                "-i",
                preview.path,
                "-frames",
                "1",
                "-c:v",
                "libwebp",
                thumb_path,
            ]

            process = sp.run(
                ffmpeg_cmd,
                capture_output=True,
            )

            if process.returncode != 0:
                logger.error(process.stderr)
                return ""

        else:
            # need to generate from existing images
            preview_dir = os.path.join(CACHE_DIR, "preview_frames")
            file_start = f"preview_{self.camera}-"
            start_file = f"{file_start}{self.start_time}.{PREVIEW_FRAME_TYPE}"
            end_file = f"{file_start}{self.end_time}.{PREVIEW_FRAME_TYPE}"
            selected_preview = None
            # Preview frames are written at most 1-2 fps during activity
            # and as little as one every 30s during quiet periods, so a
            # short export window can contain zero frames. Track the most
            # recent frame before the window as a fallback.
            fallback_preview = None

            for file in sorted(os.listdir(preview_dir)):
                if not file.startswith(file_start):
                    continue

                if file < start_file:
                    fallback_preview = os.path.join(preview_dir, file)
                    continue

                if file > end_file:
                    break

                selected_preview = os.path.join(preview_dir, file)
                break

            if not selected_preview:
                selected_preview = fallback_preview

            if not selected_preview:
                return ""

            shutil.copyfile(selected_preview, thumb_path)

        return thumb_path

    def get_record_export_command(
        self, video_path: str, use_hwaccel: bool = True
    ) -> tuple[list[str], str | list[str]]:
        if self.staged_runs:
            # each run was already rendered to a temp file with a common
            # track timescale, so the concat demuxer has nothing left to
            # reconcile and every chapter offset lines up with the merged
            # timeline the staged files reproduce
            recordings = [
                _ChapterWindow(span_start, span_end)
                for _row, span_start, span_end, _is_main in self._merged_spans()
            ]
            playlist_lines = [f"file '{path}'" for path in self.staged_runs]
            ffmpeg_input = (
                "-y -protocol_whitelist pipe,file -f concat -safe 0 -i /dev/stdin"
            )
            return self._finish_record_export_command(
                video_path, ffmpeg_input, playlist_lines, recordings, use_hwaccel
            )

        pin = self.pinned_stream

        if pin is not None:
            # a pinned export reads that stream and only that stream, so
            # its own rows are the ones the chapters describe
            recordings = self._get_recordings_for_range(pin)
        else:
            # never mix streams in one playlist; use main when available
            # and fall back to sub for expired-main history
            recordings = self._get_recordings_for_range(STREAM_TYPE_MAIN)

            if not recordings:
                recordings = self._get_recordings_for_range(STREAM_TYPE_SUB)

        playlist_lines: list[str] = []
        if (self.end_time - self.start_time) <= MAX_PLAYLIST_SECONDS:
            playlist_url = self._vod_url(pin, self.start_time, self.end_time)
            ffmpeg_input = (
                f"-y -protocol_whitelist pipe,file,http,tcp -i {playlist_url}"
            )
        else:
            # Chunk the recording rows into pages so each playlist line
            # references a bounded sub-range rather than the full export.
            page_size = 1000
            for i in range(0, len(recordings), page_size):
                chunk = recordings[i : i + page_size]
                chunk_url = self._vod_url(
                    pin, float(chunk[0].start_time), float(chunk[-1].end_time)
                )
                playlist_lines.append(f"file '{chunk_url}'")

            ffmpeg_input = "-y -protocol_whitelist pipe,file,http,tcp -f concat -safe 0 -i /dev/stdin"

        return self._finish_record_export_command(
            video_path, ffmpeg_input, playlist_lines, recordings, use_hwaccel
        )

    def _finish_record_export_command(
        self,
        video_path: str,
        ffmpeg_input: str,
        playlist_lines: list[str],
        recordings: list[Any],
        use_hwaccel: bool,
    ) -> tuple[list[str], str | list[str]]:
        """Apply encoding, chapters, and metadata to a prepared input."""
        if self.ffmpeg_input_args is not None and self.ffmpeg_output_args is not None:
            hwaccel_args = (
                self.config.cameras[self.camera].record.export.hwaccel_args
                if use_hwaccel
                else None
            )
            ffmpeg_cmd = (
                parse_preset_hardware_acceleration_encode(
                    self.config.ffmpeg.ffmpeg_path,
                    hwaccel_args,
                    f"{self.ffmpeg_input_args} -an {ffmpeg_input}".strip(),
                    f"{self.ffmpeg_output_args} -movflags +faststart".strip(),
                    EncodeTypeEnum.timelapse,
                )
            ).split(" ")
        else:
            # Realtime/stream-copy export. Embed chapter metadata according to
            # the camera's configured chapter mode: per-recording-segment
            # timestamps or per-review-item titles.
            if self.chapters == ChaptersEnum.recording_segments:
                chapters_path = self._build_recording_segment_chapter_metadata_file(
                    recordings
                )
            elif self.chapters == ChaptersEnum.review_items:
                chapters_path = self._build_chapter_metadata_file(recordings)
            else:
                chapters_path = None

            chapter_args = (
                f" -i {chapters_path} -map 0 -dn -map_metadata 1"
                if chapters_path
                else ""
            )
            ffmpeg_cmd = (
                f"{self.config.ffmpeg.ffmpeg_path} -hide_banner {ffmpeg_input}{chapter_args} -c copy -movflags +faststart"
            ).split(" ")

        # add metadata
        title = f"Frigate Recording for {self.camera}, {self.get_datetime_from_timestamp(self.start_time)} - {self.get_datetime_from_timestamp(self.end_time)}"
        creation_time = datetime.datetime.fromtimestamp(
            self.start_time, tz=datetime.UTC
        ).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        ffmpeg_cmd.extend(
            [
                "-metadata",
                f"title={title}",
                "-metadata",
                f"creation_time={creation_time}",
                "-metadata",
                f"comment=Camera: {self.camera}",
            ]
        )

        ffmpeg_cmd.append(video_path)

        return ffmpeg_cmd, playlist_lines

    def get_preview_export_command(
        self, video_path: str, use_hwaccel: bool = True
    ) -> tuple[list[str], list[str]]:
        playlist_lines = []
        codec = "-c copy"

        if is_current_hour(self.start_time):
            # get list of current preview frames
            preview_dir = os.path.join(CACHE_DIR, "preview_frames")
            file_start = f"preview_{self.camera}-"
            start_file = f"{file_start}{self.start_time}.{PREVIEW_FRAME_TYPE}"
            end_file = f"{file_start}{self.end_time}.{PREVIEW_FRAME_TYPE}"

            for file in sorted(os.listdir(preview_dir)):
                if not file.startswith(file_start):
                    continue

                if file < start_file:
                    continue

                if file > end_file:
                    break

                playlist_lines.append(f"file '{os.path.join(preview_dir, file)}'")
                playlist_lines.append("duration 0.12")

            if playlist_lines:
                last_file = playlist_lines[-2]
                playlist_lines.append(last_file)
                codec = "-c:v libx264"

        # get full set of previews
        export_previews = (
            Previews.select(
                Previews.path,
                Previews.start_time,
                Previews.end_time,
            )
            .where(
                Previews.start_time.between(self.start_time, self.end_time)
                | Previews.end_time.between(self.start_time, self.end_time)
                | (
                    (self.start_time > Previews.start_time)
                    & (self.end_time < Previews.end_time)
                )
            )
            .where(Previews.camera == self.camera)
            .order_by(Previews.start_time.asc())
            .namedtuples()
            .iterator()
        )

        for preview in export_previews:
            playlist_lines.append(f"file '{preview.path}'")

            if preview.start_time < self.start_time:
                playlist_lines.append(
                    f"inpoint {int(self.start_time - preview.start_time)}"
                )

            if preview.end_time > self.end_time:
                playlist_lines.append(
                    f"outpoint {int(preview.end_time - self.end_time)}"
                )

        ffmpeg_input = (
            "-y -protocol_whitelist pipe,file,tcp -f concat -safe 0 -i /dev/stdin"
        )

        if self.ffmpeg_input_args is not None and self.ffmpeg_output_args is not None:
            hwaccel_args = (
                self.config.cameras[self.camera].record.export.hwaccel_args
                if use_hwaccel
                else None
            )
            ffmpeg_cmd = (
                parse_preset_hardware_acceleration_encode(
                    self.config.ffmpeg.ffmpeg_path,
                    hwaccel_args,
                    f"{self.ffmpeg_input_args} {TIMELAPSE_DATA_INPUT_ARGS} {ffmpeg_input}".strip(),
                    f"{self.ffmpeg_output_args} -movflags +faststart".strip(),
                    EncodeTypeEnum.timelapse,
                )
            ).split(" ")
        else:
            ffmpeg_cmd = (
                f"{self.config.ffmpeg.ffmpeg_path} -hide_banner {ffmpeg_input} {codec} -movflags +faststart"
            ).split(" ")

        # add metadata
        title = f"Frigate Preview for {self.camera}, {self.get_datetime_from_timestamp(self.start_time)} - {self.get_datetime_from_timestamp(self.end_time)}"
        creation_time = datetime.datetime.fromtimestamp(
            self.start_time, tz=datetime.UTC
        ).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        ffmpeg_cmd.extend(
            [
                "-metadata",
                f"title={title}",
                "-metadata",
                f"creation_time={creation_time}",
                "-metadata",
                f"comment=Camera: {self.camera}",
            ]
        )

        ffmpeg_cmd.append(video_path)

        return ffmpeg_cmd, playlist_lines

    def run(self) -> None:
        logger.debug(
            f"Beginning export for {self.camera} from {self.start_time} to {self.end_time}"
        )
        self._emit_progress("preparing", 0.0)
        export_name = (
            self.user_provided_name
            or f"{self.camera.replace('_', ' ')} {self.get_datetime_from_timestamp(self.start_time)} {self.get_datetime_from_timestamp(self.end_time)}"
        )
        filename_start_datetime = datetime.datetime.fromtimestamp(
            self.start_time
        ).strftime("%Y%m%d_%H%M%S")
        filename_end_datetime = datetime.datetime.fromtimestamp(self.end_time).strftime(
            "%Y%m%d_%H%M%S"
        )
        cleaned_export_id = self.export_id.split("_")[-1]

        if self.user_provided_name:
            video_path = export_video_path(self.user_provided_name, self.export_id)
        else:
            video_path = f"{EXPORT_DIR}/{self.camera}_{filename_start_datetime}-{filename_end_datetime}_{cleaned_export_id}.mp4"
        thumb_path = self.save_thumbnail(self.export_id)
        if thumb_path:
            chown_to_runtime(thumb_path)

        export_values = {
            Export.id: self.export_id,
            Export.camera: self.camera,
            Export.name: export_name,
            Export.date: self.start_time,
            Export.video_path: video_path,
            Export.thumb_path: thumb_path,
            Export.in_progress: True,
        }

        if self.export_case_id is not None:
            export_values[Export.export_case] = self.export_case_id

        Export.insert(export_values).execute()

        try:
            self._run_export(video_path, thumb_path)
        finally:
            # staged runs hold a full copy of the export, so they must not
            # survive a failure the way the small chapter file could
            self._cleanup_staged_runs()

    def _discard_failed_export(self, video_path: str, thumb_path: str) -> None:
        """Drop the partial output and the row that promised it."""
        Path(video_path).unlink(missing_ok=True)
        Export.delete().where(Export.id == self.export_id).execute()
        Path(thumb_path).unlink(missing_ok=True)

    def _run_export(self, video_path: str, thumb_path: str) -> None:
        try:
            if self.playback_source == PlaybackSourceEnum.recordings:
                if not self._prepare_stream_runs():
                    # the merged playlist is what staging exists to avoid;
                    # falling back to it would hand the user a file whose
                    # sub-resolution stretches are frozen
                    logger.error(
                        "Failed to stage stream runs for export %s", self.export_id
                    )
                    self._discard_failed_export(video_path, thumb_path)
                    return

                ffmpeg_cmd, playlist_lines = self.get_record_export_command(video_path)
            else:
                ffmpeg_cmd, playlist_lines = self.get_preview_export_command(video_path)
        except DoesNotExist:
            return

        # When neither custom ffmpeg arg is set the default path uses
        # `-c copy` (stream copy — no re-encoding). Report that as a
        # distinct step so the UI doesn't mislabel a remux as encoding.
        # The retry branch below always re-encodes because cpu_fallback
        # requires custom args; it stays "encoding_retry".
        is_stream_copy = (
            self.ffmpeg_input_args is None and self.ffmpeg_output_args is None
        )
        initial_step = "copying" if is_stream_copy else "encoding"

        if self.staged_runs:
            # staging already reported a full pass under its own step
            initial_step = "merging"

        returncode, stderr = self._run_ffmpeg_with_progress(
            ffmpeg_cmd, playlist_lines, step=initial_step
        )

        # If export failed and cpu_fallback is enabled, retry without hwaccel
        if (
            returncode != 0
            and self.cpu_fallback
            and self.ffmpeg_input_args is not None
            and self.ffmpeg_output_args is not None
        ):
            logger.warning(
                f"Export with hardware acceleration failed, retrying without hwaccel for {self.export_id}"
            )

            if self.playback_source == PlaybackSourceEnum.recordings:
                # staged runs are always software-encoded, so there is no
                # hwaccel in them to fall back from; only the merge pass
                # is rebuilt here
                ffmpeg_cmd, playlist_lines = self.get_record_export_command(
                    video_path, use_hwaccel=False
                )
            else:
                ffmpeg_cmd, playlist_lines = self.get_preview_export_command(
                    video_path, use_hwaccel=False
                )

            returncode, stderr = self._run_ffmpeg_with_progress(
                ffmpeg_cmd, playlist_lines, step="encoding_retry"
            )

        Path(self._chapter_metadata_path()).unlink(missing_ok=True)

        if returncode != 0:
            logger.error(
                f"Failed to export {self.playback_source.value} for command {' '.join(ffmpeg_cmd)}"
            )
            logger.error(stderr)
            self._discard_failed_export(video_path, thumb_path)
            return
        else:
            chown_to_runtime(video_path)
            self._emit_progress("finalizing", 100.0)
            Export.update({Export.in_progress: False}).where(
                Export.id == self.export_id
            ).execute()

        logger.debug(f"Finished exporting {video_path}")


def migrate_exports(ffmpeg: FfmpegConfig, camera_names: list[str]) -> None:
    Path(os.path.join(CLIPS_DIR, "export")).mkdir(exist_ok=True)

    exports = []
    for export_file in os.listdir(EXPORT_DIR):
        camera = "unknown"

        for cam_name in camera_names:
            if cam_name in export_file:
                camera = cam_name
                break

        id = f"{camera}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=6))}"
        video_path = os.path.join(EXPORT_DIR, export_file)
        thumb_path = os.path.join(
            CLIPS_DIR, f"export/{id}.jpg"
        )  # use jpg because webp encoder can't get quality low enough

        ffmpeg_cmd = [
            ffmpeg.ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "warning",
            "-i",
            video_path,
            "-vf",
            "scale=-1:180",
            "-frames",
            "1",
            "-q:v",
            "8",
            thumb_path,
        ]

        process = sp.run(
            ffmpeg_cmd,
            capture_output=True,
        )

        if process.returncode != 0:
            logger.error(process.stderr)
            continue

        exports.append(
            {
                Export.id: id,
                Export.camera: camera,
                Export.name: export_file.replace(".mp4", ""),
                Export.date: os.path.getctime(video_path),
                Export.video_path: video_path,
                Export.thumb_path: thumb_path,
                Export.in_progress: False,
            }
        )

    Export.insert_many(exports).execute()
