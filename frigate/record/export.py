"""Export recordings to storage."""

import datetime
import logging
import os
import threading

from enum import Enum
import subprocess as sp

from frigate.const import EXPORT_DIR, MAX_PLAYLIST_SECONDS

logger = logging.getLogger(__name__)


class PlaybackFactorEnum(str, Enum):
    real_time = "real_time"
    timelapse_5x = "timelapse_5x"


class RecordingExporter(threading.Thread):
    """Exports a specific set of recordings for a camera to storage as a single file."""

    def __init__(
        self,
        camera: str,
        start_time: int,
        end_time: int,
        playback_factor: PlaybackFactorEnum,
    ) -> None:
        self.camera = camera
        self.start_time = start_time
        self.end_time = end_time
        self.playback_factor = playback_factor

    def get_datetime_from_timestamp(self, timestamp: int) -> str:
        """Convenience fun to get a simple date time from timestamp."""
        return datetime.datetime.fromtimestamp(timestamp).strftime("%Y/%m/%d %I:%M")

    def run(self) -> None:
        logger.debug(
            f"Beginning export for {self.camera} from {self.start_time} to {self.end_time}"
        )
        file_name = f"{EXPORT_DIR}/in_progress.{self.camera}_{self.get_datetime_from_timestamp(self.start_time)}-{self.get_datetime_from_timestamp(self.end_time)}.mp4"
        final_file_name = f"{EXPORT_DIR}/{self.camera}_{self.get_datetime_from_timestamp(self.start_time)}-{self.get_datetime_from_timestamp(self.end_time)}.mp4"

        if (self.end_time - self.start_time) <= MAX_PLAYLIST_SECONDS:
            playlist_lines = f"http://127.0.0.1:5000/vod/start/{self.start_time}/end/{self.end_time}/index.m3u8"
            ffmpeg_cmd = [
                "ffmpeg",
                "-i",
                "/dev/stdin",
            ]
        else:
            playlist_lines = []
            playlist_start = self.start_time

            while playlist_start < self.end_time:
                playlist_lines.append(
                    f"file http://127.0.0.1:5000/vod/start/{playlist_start}/end/{min(playlist_start + MAX_PLAYLIST_SECONDS, self.end_time)}/index.m3u8"
                )
                playlist_start += MAX_PLAYLIST_SECONDS

            ffmpeg_cmd = [
                "ffmpeg",
                "-y",
                "-protocol_whitelist",
                "pipe,file",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                "/dev/stdin",
            ]

        if self.playback_factor == PlaybackFactorEnum.real_time:
            ffmpeg_cmd.extend(["-c", "copy", file_name])
        elif self.playback_factor == PlaybackFactorEnum.timelapse_5x:
            ffmpeg_cmd.extend(["-vf", "setpts=0.25*PTS", "-r", "5", "-an", file_name])

        p = sp.run(
            ffmpeg_cmd,
            input="\n".join(playlist_lines)
            if len(playlist_lines) > 1
            else playlist_lines,
            encoding="ascii",
            capture_output=True,
        )

        if p.returncode != 0:
            logger.error(p.stderr)
            return

        os.rename(file_name, final_file_name)
        logger.debug("Finished exporting")
