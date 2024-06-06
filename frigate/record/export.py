"""Export recordings to storage."""

import datetime
import logging
import os
import random
import shutil
import string
import subprocess as sp
import threading
from enum import Enum
from pathlib import Path

from peewee import DoesNotExist

from frigate.config import FrigateConfig
from frigate.const import (
    CACHE_DIR,
    CLIPS_DIR,
    EXPORT_DIR,
    MAX_PLAYLIST_SECONDS,
    PREVIEW_FRAME_TYPE,
)
from frigate.ffmpeg_presets import (
    EncodeTypeEnum,
    parse_preset_hardware_acceleration_encode,
)
from frigate.models import Export, Previews, Recordings

logger = logging.getLogger(__name__)


TIMELAPSE_DATA_INPUT_ARGS = "-an -skip_frame nokey"


def lower_priority():
    os.nice(10)


class PlaybackFactorEnum(str, Enum):
    realtime = "realtime"
    timelapse_25x = "timelapse_25x"


class RecordingExporter(threading.Thread):
    """Exports a specific set of recordings for a camera to storage as a single file."""

    def __init__(
        self,
        config: FrigateConfig,
        camera: str,
        name: str,
        start_time: int,
        end_time: int,
        playback_factor: PlaybackFactorEnum,
    ) -> None:
        threading.Thread.__init__(self)
        self.config = config
        self.camera = camera
        self.user_provided_name = name
        self.start_time = start_time
        self.end_time = end_time
        self.playback_factor = playback_factor

        # ensure export thumb dir
        Path(os.path.join(CLIPS_DIR, "export")).mkdir(exist_ok=True)

    def get_datetime_from_timestamp(self, timestamp: int) -> str:
        """Convenience fun to get a simple date time from timestamp."""
        return datetime.datetime.fromtimestamp(timestamp).strftime("%Y/%m/%d %H:%M")

    def save_thumbnail(self, id: str) -> str:
        thumb_path = os.path.join(CLIPS_DIR, f"export/{id}.webp")

        if datetime.datetime.fromtimestamp(self.start_time) < datetime.datetime.now(
            datetime.timezone.utc
        ).replace(minute=0, second=0, microsecond=0):
            # has preview mp4
            try:
                preview: Previews = (
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
                "ffmpeg",
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
            file_start = f"preview_{self.camera}"
            start_file = f"{file_start}-{self.start_time}.{PREVIEW_FRAME_TYPE}"
            end_file = f"{file_start}-{self.end_time}.{PREVIEW_FRAME_TYPE}"
            selected_preview = None

            for file in sorted(os.listdir(preview_dir)):
                if not file.startswith(file_start):
                    continue

                if file < start_file:
                    continue

                if file > end_file:
                    break

                selected_preview = os.path.join(preview_dir, file)
                break

            if not selected_preview:
                return ""

            shutil.copyfile(selected_preview, thumb_path)

        return thumb_path

    def run(self) -> None:
        logger.debug(
            f"Beginning export for {self.camera} from {self.start_time} to {self.end_time}"
        )
        export_id = f"{self.camera}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=6))}"
        export_name = (
            self.user_provided_name
            or f"{self.camera.replace('_', ' ')} {self.get_datetime_from_timestamp(self.start_time)} {self.get_datetime_from_timestamp(self.end_time)}"
        )
        video_path = f"{EXPORT_DIR}/{export_id}.mp4"

        thumb_path = self.save_thumbnail(export_id)

        Export.insert(
            {
                Export.id: export_id,
                Export.camera: self.camera,
                Export.name: export_name,
                Export.date: self.start_time,
                Export.video_path: video_path,
                Export.thumb_path: thumb_path,
                Export.in_progress: True,
            }
        ).execute()

        if (self.end_time - self.start_time) <= MAX_PLAYLIST_SECONDS:
            playlist_lines = f"http://127.0.0.1:5000/vod/{self.camera}/start/{self.start_time}/end/{self.end_time}/index.m3u8"
            ffmpeg_input = (
                f"-y -protocol_whitelist pipe,file,http,tcp -i {playlist_lines}"
            )
        else:
            playlist_lines = []

            # get full set of recordings
            export_recordings = (
                Recordings.select()
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
            )

            # Use pagination to process records in chunks
            page_size = 1000
            num_pages = (export_recordings.count() + page_size - 1) // page_size

            for page in range(1, num_pages + 1):
                playlist = export_recordings.paginate(page, page_size)
                playlist_lines.append(
                    f"file 'http://127.0.0.1:5000/vod/{self.camera}/start/{float(playlist[0].start_time)}/end/{float(playlist[-1].end_time)}/index.m3u8'"
                )

            ffmpeg_input = "-y -protocol_whitelist pipe,file,http,tcp -f concat -safe 0 -i /dev/stdin"

        if self.playback_factor == PlaybackFactorEnum.realtime:
            ffmpeg_cmd = (
                f"ffmpeg -hide_banner {ffmpeg_input} -c copy -movflags +faststart {video_path}"
            ).split(" ")
        elif self.playback_factor == PlaybackFactorEnum.timelapse_25x:
            ffmpeg_cmd = (
                parse_preset_hardware_acceleration_encode(
                    self.config.ffmpeg.hwaccel_args,
                    f"{TIMELAPSE_DATA_INPUT_ARGS} {ffmpeg_input}",
                    f"{self.config.cameras[self.camera].record.export.timelapse_args} -movflags +faststart {video_path}",
                    EncodeTypeEnum.timelapse,
                )
            ).split(" ")

        p = sp.run(
            ffmpeg_cmd,
            input="\n".join(playlist_lines),
            encoding="ascii",
            preexec_fn=lower_priority,
            capture_output=True,
        )

        if p.returncode != 0:
            logger.error(
                f"Failed to export recording for command {' '.join(ffmpeg_cmd)}"
            )
            logger.error(p.stderr)
            Path(video_path).unlink(missing_ok=True)
            Export.delete().where(Export.id == export_id).execute()
            Path(thumb_path).unlink(missing_ok=True)
            return
        else:
            Export.update({Export.in_progress: False}).where(
                Export.id == export_id
            ).execute()

        logger.debug(f"Finished exporting {video_path}")


def migrate_exports(camera_names: list[str]):
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
            "ffmpeg",
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
