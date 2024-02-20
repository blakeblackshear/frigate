"""Handle outputting low res / fps preview segments from decoded frames."""

import datetime
import logging
import os
import shutil
import subprocess as sp
import threading
from pathlib import Path

import cv2
import numpy as np

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, RecordQualityEnum
from frigate.const import CACHE_DIR, CLIPS_DIR, INSERT_PREVIEW
from frigate.ffmpeg_presets import (
    FPS_VFR_PARAM,
    EncodeTypeEnum,
    parse_preset_hardware_acceleration_encode,
)
from frigate.models import Previews
from frigate.util.image import copy_yuv_to_position, get_yuv_crop

logger = logging.getLogger(__name__)

FOLDER_PREVIEW_FRAMES = "preview_frames"
PREVIEW_OUTPUT_FPS = 1
PREVIEW_SEGMENT_DURATION = 3600  # one hour
# important to have lower keyframe to maintain scrubbing performance
PREVIEW_KEYFRAME_INTERVAL = 60
PREVIEW_BIT_RATES = {
    RecordQualityEnum.very_low: 4096,
    RecordQualityEnum.low: 6144,
    RecordQualityEnum.medium: 8192,
    RecordQualityEnum.high: 12288,
    RecordQualityEnum.very_high: 16384,
}


def get_cache_image_name(camera: str, frame_time: float) -> str:
    """Get the image name in cache."""
    return os.path.join(
        CACHE_DIR,
        f"{FOLDER_PREVIEW_FRAMES}/preview_{camera}-{frame_time}.jpg",
    )


class FFMpegConverter(threading.Thread):
    """Convert a list of jpg frames into a vfr mp4."""

    def __init__(
        self,
        config: CameraConfig,
        frame_times: list[float],
        requestor: InterProcessRequestor,
    ):
        threading.Thread.__init__(self)
        self.name = f"{config.name}_preview_converter"
        self.config = config
        self.frame_times = frame_times
        self.requestor = requestor
        self.path = os.path.join(
            CLIPS_DIR,
            f"previews/{self.config.name}/{self.frame_times[0]}-{self.frame_times[-1]}.mp4",
        )

        # write a PREVIEW at fps and 1 key frame per clip
        self.ffmpeg_cmd = parse_preset_hardware_acceleration_encode(
            config.ffmpeg.hwaccel_args,
            input="-f concat -y -protocol_whitelist pipe,file -safe 0 -i /dev/stdin",
            output=f"-g {PREVIEW_KEYFRAME_INTERVAL} -fpsmax {PREVIEW_OUTPUT_FPS} -bf 0 -b:v {PREVIEW_BIT_RATES[self.config.record.preview.quality]} {FPS_VFR_PARAM} -movflags +faststart -pix_fmt yuv420p {self.path}",
            type=EncodeTypeEnum.preview,
        )

    def run(self) -> None:
        # generate input list
        item_count = len(self.frame_times)
        playlist = []

        for t_idx in range(0, item_count):
            if t_idx == item_count - 1:
                # last frame does not get a duration
                playlist.append(
                    f"file '{get_cache_image_name(self.config.name, self.frame_times[t_idx])}'"
                )
                continue

            playlist.append(
                f"file '{get_cache_image_name(self.config.name, self.frame_times[t_idx])}'"
            )
            playlist.append(
                f"duration {self.frame_times[t_idx + 1] - self.frame_times[t_idx]}"
            )

        p = sp.run(
            self.ffmpeg_cmd.split(" "),
            input="\n".join(playlist),
            encoding="ascii",
            capture_output=True,
        )

        start = self.frame_times[0]
        end = self.frame_times[-1]

        if p.returncode == 0:
            logger.debug("successfully saved preview")
            self.requestor.send_data(
                INSERT_PREVIEW,
                {
                    Previews.id: f"{self.config.name}_{end}",
                    Previews.camera: self.config.name,
                    Previews.path: self.path,
                    Previews.start_time: start,
                    Previews.end_time: end,
                    Previews.duration: end - start,
                },
            )
        else:
            logger.error(f"Error saving preview for {self.config.name} :: {p.stderr}")

        # unlink files from cache
        # don't delete last frame as it will be used as first frame in next segment
        for t in self.frame_times[0:-1]:
            Path(get_cache_image_name(self.config.name, t)).unlink(missing_ok=True)


class PreviewRecorder:
    def __init__(self, config: CameraConfig) -> None:
        self.config = config
        self.start_time = 0
        self.last_output_time = 0
        self.output_frames = []
        self.out_height = 180
        self.out_width = (
            int((config.detect.width / config.detect.height) * self.out_height) // 4 * 4
        )

        # create communication for finished previews
        self.requestor = InterProcessRequestor()

        y, u1, u2, v1, v2 = get_yuv_crop(
            self.config.frame_shape_yuv,
            (
                0,
                0,
                self.config.frame_shape[1],
                self.config.frame_shape[0],
            ),
        )
        self.channel_dims = {
            "y": y,
            "u1": u1,
            "u2": u2,
            "v1": v1,
            "v2": v2,
        }

        # end segment at end of hour
        self.segment_end = (
            (datetime.datetime.now() + datetime.timedelta(hours=1))
            .replace(minute=0, second=0, microsecond=0)
            .timestamp()
        )

        Path(os.path.join(CACHE_DIR, "preview_frames")).mkdir(exist_ok=True)
        Path(os.path.join(CLIPS_DIR, f"previews/{config.name}")).mkdir(
            parents=True, exist_ok=True
        )

    def should_write_frame(
        self,
        current_tracked_objects: list[dict[str, any]],
        motion_boxes: list[list[int]],
        frame_time: float,
    ) -> bool:
        """Decide if this frame should be added to PREVIEW."""
        # limit output to 1 fps
        if (frame_time - self.last_output_time) < 1 / PREVIEW_OUTPUT_FPS:
            return False

        # send frame if a non-stationary object is in a zone
        if any(
            (len(o["current_zones"]) > 0 and not o["stationary"])
            for o in current_tracked_objects
        ):
            self.last_output_time = frame_time
            return True

        if len(motion_boxes) > 0:
            self.last_output_time = frame_time
            return True

        return False

    def write_frame_to_cache(self, frame_time: float, frame) -> None:
        # resize yuv frame
        small_frame = np.zeros((self.out_height * 3 // 2, self.out_width), np.uint8)
        copy_yuv_to_position(
            small_frame,
            (0, 0),
            (self.out_height, self.out_width),
            frame,
            self.channel_dims,
            cv2.INTER_AREA,
        )
        small_frame = cv2.cvtColor(
            small_frame,
            cv2.COLOR_YUV2BGR_I420,
        )
        _, jpg = cv2.imencode(".jpg", small_frame)
        with open(
            get_cache_image_name(self.config.name, frame_time),
            "wb",
        ) as j:
            j.write(jpg.tobytes())

    def write_data(
        self,
        current_tracked_objects: list[dict[str, any]],
        motion_boxes: list[list[int]],
        frame_time: float,
        frame,
    ) -> None:
        # always write the first frame
        if self.start_time == 0:
            self.start_time = frame_time
            self.output_frames.append(frame_time)
            self.write_frame_to_cache(frame_time, frame)
            return

        # check if PREVIEW clip should be generated and cached frames reset
        if frame_time >= self.segment_end:
            # save last frame to ensure consistent duration
            self.output_frames.append(frame_time)
            self.write_frame_to_cache(frame_time, frame)
            FFMpegConverter(
                self.config,
                self.output_frames,
                self.requestor,
            ).start()

            # reset frame cache
            self.segment_end = (
                (datetime.datetime.now() + datetime.timedelta(hours=1))
                .replace(minute=0, second=0, microsecond=0)
                .timestamp()
            )
            self.start_time = frame_time
            self.last_output_time = frame_time
            self.output_frames = []

            # include first frame to ensure consistent duration
            self.output_frames.append(frame_time)
            self.write_frame_to_cache(frame_time, frame)
        elif self.should_write_frame(current_tracked_objects, motion_boxes, frame_time):
            self.output_frames.append(frame_time)
            self.write_frame_to_cache(frame_time, frame)

    def stop(self) -> None:
        try:
            shutil.rmtree(os.path.join(CACHE_DIR, FOLDER_PREVIEW_FRAMES))
        except FileNotFoundError:
            pass

        self.requestor.stop()
