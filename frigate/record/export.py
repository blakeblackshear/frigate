"""Export recordings to storage."""

import datetime
import logging
import os
import subprocess as sp
import threading
from enum import Enum
from pathlib import Path

from frigate.config import FrigateConfig
from frigate.const import EXPORT_DIR, MAX_PLAYLIST_SECONDS
from frigate.ffmpeg_presets import (
    EncodeTypeEnum,
    parse_preset_hardware_acceleration_encode,
)
from frigate.models import Recordings

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

    def get_datetime_from_timestamp(self, timestamp: int) -> str:
        """Convenience fun to get a simple date time from timestamp."""
        return datetime.datetime.fromtimestamp(timestamp).strftime("%Y_%m_%d_%H_%M")

    def run(self) -> None:
        logger.debug(
            f"Beginning export for {self.camera} from {self.start_time} to {self.end_time}"
        )
        file_name = (
            self.user_provided_name
            or f"{self.camera}_{self.get_datetime_from_timestamp(self.start_time)}__{self.get_datetime_from_timestamp(self.end_time)}"
        )
        file_path = f"{EXPORT_DIR}/in_progress.{file_name}.mp4"
        final_file_path = f"{EXPORT_DIR}/{file_name}.mp4"

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
                f"ffmpeg -hide_banner {ffmpeg_input} -c copy {file_path}"
            ).split(" ")
        elif self.playback_factor == PlaybackFactorEnum.timelapse_25x:
            ffmpeg_cmd = (
                parse_preset_hardware_acceleration_encode(
                    self.config.ffmpeg.hwaccel_args,
                    f"{TIMELAPSE_DATA_INPUT_ARGS} {ffmpeg_input}",
                    f"{self.config.cameras[self.camera].record.export.timelapse_args} {file_path}",
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
            Path(file_path).unlink(missing_ok=True)
            return

        logger.debug(f"Updating finalized export {file_path}")
        os.rename(file_path, final_file_path)
        logger.debug(f"Finished exporting {file_path}")
