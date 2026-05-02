"""Export recordings to storage."""

import datetime
import logging
import os
import random
import re
import shutil
import string
import subprocess as sp
import threading
from enum import Enum
from pathlib import Path
from typing import Callable, Optional

import pytz
from peewee import DoesNotExist

from frigate.config import FfmpegConfig, FrigateConfig
from frigate.const import (
    CACHE_DIR,
    CLIPS_DIR,
    EXPORT_DIR,
    MAX_PLAYLIST_SECONDS,
    PREVIEW_FRAME_TYPE,
    PROCESS_PRIORITY_LOW,
)
from frigate.ffmpeg_presets import (
    EncodeTypeEnum,
    parse_preset_hardware_acceleration_encode,
)
from frigate.models import Export, Previews, Recordings, ReviewSegment
from frigate.util.time import is_current_hour

logger = logging.getLogger(__name__)


DEFAULT_TIME_LAPSE_FFMPEG_ARGS = "-vf setpts=0.04*PTS -r 30"
TIMELAPSE_DATA_INPUT_ARGS = "-an -skip_frame nokey"

# Matches the setpts factor used in timelapse exports (e.g. setpts=0.04*PTS).
# Captures the floating-point factor so we can scale expected duration.
SETPTS_FACTOR_RE = re.compile(r"setpts=([0-9]*\.?[0-9]+)\*PTS")

# ffmpeg flags that can read from or write to arbitrary files
BLOCKED_FFMPEG_ARGS = frozenset(
    {
        "-i",
        "-filter_script",
        "-filter_complex",
        "-lavfi",
        "-vf",
        "-af",
        "-filter",
        "-vstats_file",
        "-passlogfile",
        "-sdp_file",
        "-dump_attachment",
        "-attach",
    }
)


def validate_ffmpeg_args(args: str) -> tuple[bool, str]:
    """Validate that user-provided ffmpeg args don't allow input/output injection.

    Blocks:
    - The -i flag and other flags that read/write arbitrary files
    - Filter flags (can read files via movie=/amovie= source filters)
    - Absolute/relative file paths (potential extra outputs)
    - URLs and ffmpeg protocol references (data exfiltration)

    Admin users skip this validation entirely since they are trusted.
    """
    if not args or not args.strip():
        return True, ""

    tokens = args.split()
    for token in tokens:
        # Block flags that could inject inputs or write to arbitrary files
        if token.lower() in BLOCKED_FFMPEG_ARGS:
            return False, f"Forbidden ffmpeg argument: {token}"

        # Block tokens that look like file paths (potential output injection)
        if (
            token.startswith("/")
            or token.startswith("./")
            or token.startswith("../")
            or token.startswith("~")
        ):
            return False, "File paths are not allowed in custom ffmpeg arguments"

        # Block URLs and ffmpeg protocol references (e.g. http://, tcp://, pipe:, file:)
        if "://" in token or token.startswith("pipe:") or token.startswith("file:"):
            return (
                False,
                "Protocol references are not allowed in custom ffmpeg arguments",
            )

    return True, ""


class PlaybackSourceEnum(str, Enum):
    recordings = "recordings"
    preview = "preview"


class RecordingExporter(threading.Thread):
    """Exports a specific set of recordings for a camera to storage as a single file."""

    def __init__(
        self,
        config: FrigateConfig,
        id: str,
        camera: str,
        name: Optional[str],
        image: Optional[str],
        start_time: int,
        end_time: int,
        playback_source: PlaybackSourceEnum,
        export_case_id: Optional[str] = None,
        ffmpeg_input_args: Optional[str] = None,
        ffmpeg_output_args: Optional[str] = None,
        cpu_fallback: bool = False,
        on_progress: Optional[Callable[[str, float], None]] = None,
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
        self.on_progress = on_progress

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

    def _sum_source_duration_seconds(self) -> Optional[float]:
        """Sum saved-video seconds inside [start_time, end_time].

        Queries Recordings or Previews depending on the playback source,
        clamps each segment to the requested range, and returns the total.
        Returns ``None`` on any error so the caller can fall back to the
        requested range duration without losing progress reporting.
        """
        try:
            if self.playback_source == PlaybackSourceEnum.recordings:
                rows = (
                    Recordings.select(Recordings.start_time, Recordings.end_time)
                    .where(
                        Recordings.start_time.between(self.start_time, self.end_time)
                        | Recordings.end_time.between(self.start_time, self.end_time)
                        | (
                            (self.start_time > Recordings.start_time)
                            & (self.end_time < Recordings.end_time)
                        )
                    )
                    .where(Recordings.camera == self.camera)
                    .iterator()
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

    def _inject_progress_flags(self, ffmpeg_cmd: list[str]) -> list[str]:
        """Insert FFmpeg progress reporting flags before the output path.

        ``-progress pipe:2`` writes structured key=value lines to stderr,
        ``-nostats`` suppresses the noisy default stats output.
        """
        if not ffmpeg_cmd:
            return ffmpeg_cmd
        return ffmpeg_cmd[:-1] + ["-progress", "pipe:2", "-nostats", ffmpeg_cmd[-1]]

    def _run_ffmpeg_with_progress(
        self,
        ffmpeg_cmd: list[str],
        playlist_lines: str | list[str],
        step: str = "encoding",
    ) -> tuple[int, str]:
        """Run an FFmpeg export command, parsing progress events from stderr.

        Returns ``(returncode, captured_stderr)``. Stdout is left attached to
        the parent process so we don't have to drain it (and risk a deadlock
        if the buffer fills). Progress percent is computed against the
        expected output duration; values are clamped to [0, 100] inside
        :py:meth:`_emit_progress`.
        """
        cmd = ["nice", "-n", str(PROCESS_PRIORITY_LOW)] + self._inject_progress_flags(
            ffmpeg_cmd
        )

        if isinstance(playlist_lines, list):
            stdin_payload = "\n".join(playlist_lines)
        else:
            stdin_payload = playlist_lines

        expected_duration = self._expected_output_duration_seconds()

        self._emit_progress(step, 0.0)

        proc = sp.Popen(
            cmd,
            stdin=sp.PIPE,
            stderr=sp.PIPE,
            text=True,
            encoding="ascii",
            errors="replace",
        )

        assert proc.stdin is not None
        assert proc.stderr is not None

        try:
            proc.stdin.write(stdin_payload)
        except (BrokenPipeError, OSError):
            # FFmpeg may have rejected the input early; still wait for it
            # to terminate so the returncode is meaningful.
            pass
        finally:
            try:
                proc.stdin.close()
            except (BrokenPipeError, OSError):
                pass

        captured: list[str] = []

        try:
            for raw_line in proc.stderr:
                captured.append(raw_line)
                line = raw_line.strip()

                if not line:
                    continue

                if line.startswith("out_time_us="):
                    if expected_duration <= 0:
                        continue
                    try:
                        out_time_us = int(line.split("=", 1)[1])
                    except (ValueError, IndexError):
                        continue
                    if out_time_us < 0:
                        continue
                    out_seconds = out_time_us / 1_000_000.0
                    percent = (out_seconds / expected_duration) * 100.0
                    self._emit_progress(step, percent)
                elif line == "progress=end":
                    self._emit_progress(step, 100.0)
                    break
        except Exception:
            logger.exception("Failed reading FFmpeg progress for %s", self.export_id)

        proc.wait()

        # Drain any remaining stderr so callers can log it on failure.
        try:
            remaining = proc.stderr.read()
            if remaining:
                captured.append(remaining)
        except Exception:
            pass

        return proc.returncode, "".join(captured)

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

    def _build_chapter_metadata_file(self, recordings: list) -> Optional[str]:
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
            start_out = wall_to_output(float(review.start_time))
            end_out = wall_to_output(float(review.end_time))

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

    def save_thumbnail(self, id: str) -> str:
        thumb_path = os.path.join(CLIPS_DIR, f"export/{id}.webp")

        if self.user_provided_image is not None and os.path.isfile(
            self.user_provided_image
        ):
            shutil.copy(self.user_provided_image, thumb_path)
            return thumb_path

        if (
            self.start_time
            < datetime.datetime.now(datetime.timezone.utc)
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

            diff = self.start_time - preview.start_time
            minutes = int(diff / 60)
            seconds = int(diff % 60)
            ffmpeg_cmd = [
                "/usr/lib/ffmpeg/7.0/bin/ffmpeg",  # hardcode path for exports thumbnail due to missing libwebp support
                "-hide_banner",
                "-loglevel",
                "warning",
                "-ss",
                f"00:{minutes}:{seconds}",
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
        # handle case where internal port is a string with ip:port
        internal_port = self.config.networking.listen.internal
        if type(internal_port) is str:
            internal_port = int(internal_port.split(":")[-1])

        recordings = list(
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
            .where(Recordings.camera == self.camera)
            .order_by(Recordings.start_time.asc())
            .iterator()
        )

        playlist_lines: list[str] = []
        if (self.end_time - self.start_time) <= MAX_PLAYLIST_SECONDS:
            playlist_url = f"http://127.0.0.1:{internal_port}/vod/{self.camera}/start/{self.start_time}/end/{self.end_time}/index.m3u8"
            ffmpeg_input = (
                f"-y -protocol_whitelist pipe,file,http,tcp -i {playlist_url}"
            )
        else:
            # Chunk the recording rows into pages so each playlist line
            # references a bounded sub-range rather than the full export.
            page_size = 1000
            for i in range(0, len(recordings), page_size):
                chunk = recordings[i : i + page_size]
                playlist_lines.append(
                    f"file 'http://127.0.0.1:{internal_port}/vod/{self.camera}/start/{float(chunk[0].start_time)}/end/{float(chunk[-1].end_time)}/index.m3u8'"
                )

            ffmpeg_input = "-y -protocol_whitelist pipe,file,http,tcp -f concat -safe 0 -i /dev/stdin"

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
            chapters_path = self._build_chapter_metadata_file(recordings)
            chapter_args = (
                f" -i {chapters_path} -map 0 -map_metadata 1" if chapters_path else ""
            )
            ffmpeg_cmd = (
                f"{self.config.ffmpeg.ffmpeg_path} -hide_banner {ffmpeg_input}{chapter_args} -c copy -movflags +faststart"
            ).split(" ")

        # add metadata
        title = f"Frigate Recording for {self.camera}, {self.get_datetime_from_timestamp(self.start_time)} - {self.get_datetime_from_timestamp(self.end_time)}"
        ffmpeg_cmd.extend(["-metadata", f"title={title}"])

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
                    f"{self.ffmpeg_output_args} -movflags +faststart {video_path}".strip(),
                    EncodeTypeEnum.timelapse,
                )
            ).split(" ")
        else:
            ffmpeg_cmd = (
                f"{self.config.ffmpeg.ffmpeg_path} -hide_banner {ffmpeg_input} {codec} -movflags +faststart {video_path}"
            ).split(" ")

        # add metadata
        title = f"Frigate Preview for {self.camera}, {self.get_datetime_from_timestamp(self.start_time)} - {self.get_datetime_from_timestamp(self.end_time)}"
        ffmpeg_cmd.extend(["-metadata", f"title={title}"])

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
        video_path = f"{EXPORT_DIR}/{self.camera}_{filename_start_datetime}-{filename_end_datetime}_{cleaned_export_id}.mp4"
        thumb_path = self.save_thumbnail(self.export_id)

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
            if self.playback_source == PlaybackSourceEnum.recordings:
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
            Path(video_path).unlink(missing_ok=True)
            Export.delete().where(Export.id == self.export_id).execute()
            Path(thumb_path).unlink(missing_ok=True)
            return
        else:
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
