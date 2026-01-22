"""Handle outputting low res / fps preview segments from decoded frames."""

import datetime
import logging
import os
import shutil
import subprocess as sp
import threading
import time
from pathlib import Path
from typing import Any, Optional

import cv2
import numpy as np
from peewee import DoesNotExist

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, FfmpegConfig, RecordQualityEnum
from frigate.const import CACHE_DIR, CLIPS_DIR, INSERT_PREVIEW, PREVIEW_FRAME_TYPE
from frigate.ffmpeg_presets import (
    FPS_VFR_PARAM,
    EncodeTypeEnum,
    parse_preset_hardware_acceleration_encode,
)
from frigate.models import Previews
from frigate.track.object_processing import TrackedObject
from frigate.util.image import (
    copy_yuv_to_position,
    get_blank_yuv_frame,
    get_yuv_crop,
    run_ffmpeg_snapshot,
)

logger = logging.getLogger(__name__)

FOLDER_PREVIEW_FRAMES = "preview_frames"
PREVIEW_CACHE_DIR = os.path.join(CACHE_DIR, FOLDER_PREVIEW_FRAMES)
PREVIEW_SEGMENT_DURATION = 3600  # one hour
# important to have lower keyframe to maintain scrubbing performance
PREVIEW_KEYFRAME_INTERVAL = 40
PREVIEW_HEIGHT = 180
PREVIEW_QUALITY_WEBP = {
    RecordQualityEnum.very_low: 70,
    RecordQualityEnum.low: 80,
    RecordQualityEnum.medium: 80,
    RecordQualityEnum.high: 80,
    RecordQualityEnum.very_high: 86,
}
PREVIEW_QUALITY_BIT_RATES = {
    RecordQualityEnum.very_low: 7168,
    RecordQualityEnum.low: 8196,
    RecordQualityEnum.medium: 9216,
    RecordQualityEnum.high: 9864,
    RecordQualityEnum.very_high: 10096,
}


def get_cache_image_name(camera: str, frame_time: float) -> str:
    """Get the image name in cache."""
    return os.path.join(
        CACHE_DIR,
        f"{FOLDER_PREVIEW_FRAMES}/preview_{camera}-{frame_time}.{PREVIEW_FRAME_TYPE}",
    )


def get_most_recent_preview_frame(
    camera: str, before: float = None, ffmpeg_config: Optional[FfmpegConfig] = None
) -> str | None:
    """Get the most recent preview frame for a camera.

    First tries to find a cached preview webp frame. If none exists (e.g., they've been
    cleaned up after preview video creation), attempts to extract the last frame from
    the most recent preview video.

    Args:
        camera: Camera name
        before: Optional timestamp to find frames before this time
        ffmpeg_config: Optional ffmpeg configuration for extracting from video fallback

    Returns:
        Path to a preview frame image file, or None if not available
    """
    if not os.path.exists(PREVIEW_CACHE_DIR):
        logger.debug(f"Preview cache directory does not exist: {PREVIEW_CACHE_DIR}")
    else:
        try:
            # files are named preview_{camera}-{timestamp}.webp
            # we want the largest timestamp that is less than or equal to before
            preview_files = [
                f
                for f in os.listdir(PREVIEW_CACHE_DIR)
                if f.startswith(f"preview_{camera}-")
                and f.endswith(f".{PREVIEW_FRAME_TYPE}")
            ]

            if preview_files:
                # sort by timestamp in descending order
                # filenames are like preview_front-1712345678.901234.webp
                preview_files.sort(reverse=True)

                if before is None:
                    return os.path.join(PREVIEW_CACHE_DIR, preview_files[0])

                for file_name in preview_files:
                    try:
                        # Extract timestamp: preview_front-1712345678.901234.webp
                        # Split by dash and extension
                        timestamp_part = file_name.split("-")[-1].split(
                            f".{PREVIEW_FRAME_TYPE}"
                        )[0]
                        timestamp = float(timestamp_part)

                        if timestamp <= before:
                            return os.path.join(PREVIEW_CACHE_DIR, file_name)
                    except (ValueError, IndexError):
                        continue
        except Exception as e:
            logger.error(f"Error searching for cached preview frames: {e}")

    # If no cached frames exist and ffmpeg_config is provided, try extracting from preview video
    if ffmpeg_config is not None:
        try:
            logger.debug(
                f"No cached preview frames found for {camera}, attempting to extract from preview video"
            )

            query = Previews.select().where(Previews.camera == camera)

            if before is not None:
                query = query.where(Previews.end_time <= before)

            preview = query.order_by(Previews.end_time.desc()).limit(1).get()

            if preview and os.path.exists(preview.path):
                logger.debug(
                    f"Found preview video for {camera}: {preview.path} (duration: {preview.duration}s)"
                )

                # Extract the last frame from the video
                # Use webp for consistency with cached frames
                image_data, error_msg = run_ffmpeg_snapshot(
                    ffmpeg_config,
                    preview.path,
                    codec="webp",
                    seek_time=max(0, preview.duration - 0.1),  # Seek to near the end
                    height=PREVIEW_HEIGHT,
                    timeout=10,
                )

                if image_data:
                    # Write to a temporary file in the cache directory
                    # Use timestamp from the preview end time
                    temp_frame_path = os.path.join(
                        PREVIEW_CACHE_DIR,
                        f"preview_{camera}-{preview.end_time}_from_video.{PREVIEW_FRAME_TYPE}",
                    )

                    with open(temp_frame_path, "wb") as f:
                        f.write(image_data)

                    logger.debug(
                        f"Successfully extracted last frame from preview video to {temp_frame_path}"
                    )
                    return temp_frame_path
                else:
                    logger.warning(
                        f"Failed to extract frame from preview video {preview.path}: {error_msg}"
                    )
            else:
                if preview:
                    logger.warning(f"Preview video path does not exist: {preview.path}")
                else:
                    logger.debug(f"No preview video found in database for {camera}")

        except DoesNotExist:
            logger.debug(f"No preview video found in database for {camera}")
        except Exception as e:
            logger.error(f"Error extracting frame from preview video: {e}")

    return None


class FFMpegConverter(threading.Thread):
    """Convert a list of still frames into a vfr mp4."""

    def __init__(
        self,
        config: CameraConfig,
        frame_times: list[float],
        requestor: InterProcessRequestor,
    ):
        super().__init__(name=f"{config.name}_preview_converter")
        self.config = config
        self.frame_times = frame_times
        self.requestor = requestor
        self.path = os.path.join(
            CLIPS_DIR,
            f"previews/{self.config.name}/{self.frame_times[0]}-{self.frame_times[-1]}.mp4",
        )

        # write a PREVIEW at fps and 1 key frame per clip
        self.ffmpeg_cmd = parse_preset_hardware_acceleration_encode(
            config.ffmpeg.ffmpeg_path,
            "default",
            input="-f concat -y -protocol_whitelist pipe,file -safe 0 -threads 1 -i /dev/stdin",
            output=f"-threads 1 -g {PREVIEW_KEYFRAME_INTERVAL} -bf 0 -b:v {PREVIEW_QUALITY_BIT_RATES[self.config.record.preview.quality]} {FPS_VFR_PARAM} -movflags +faststart -pix_fmt yuv420p {self.path}",
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

        try:
            p = sp.run(
                self.ffmpeg_cmd.split(" "),
                input="\n".join(playlist),
                encoding="ascii",
                capture_output=True,
            )
        except BlockingIOError:
            logger.warning(
                f"Failed to create preview for {self.config.name}, retrying..."
            )
            time.sleep(2)
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
                    Previews.id.name: f"{self.config.name}_{end}",
                    Previews.camera.name: self.config.name,
                    Previews.path.name: self.path,
                    Previews.start_time.name: start,
                    Previews.end_time.name: end,
                    Previews.duration.name: end - start,
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
        self.offline = False
        self.output_frames = []

        if config.detect.width > config.detect.height:
            self.out_height = PREVIEW_HEIGHT
            self.out_width = (
                int((config.detect.width / config.detect.height) * self.out_height)
                // 4
                * 4
            )
        else:
            self.out_width = PREVIEW_HEIGHT
            self.out_height = (
                int((config.detect.height / config.detect.width) * self.out_width)
                // 4
                * 4
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
            .astimezone(datetime.timezone.utc)
            .replace(minute=0, second=0, microsecond=0)
            .timestamp()
        )

        Path(PREVIEW_CACHE_DIR).mkdir(exist_ok=True)
        Path(os.path.join(CLIPS_DIR, f"previews/{config.name}")).mkdir(
            parents=True, exist_ok=True
        )

        # check for existing items in cache
        start_ts = (
            datetime.datetime.now()
            .astimezone(datetime.timezone.utc)
            .replace(minute=0, second=0, microsecond=0)
            .timestamp()
        )

        file_start = f"preview_{config.name}"
        start_file = f"{file_start}-{start_ts}.webp"

        for file in sorted(os.listdir(os.path.join(CACHE_DIR, FOLDER_PREVIEW_FRAMES))):
            if not file.startswith(file_start):
                continue

            if file < start_file:
                os.unlink(os.path.join(PREVIEW_CACHE_DIR, file))
                continue

            try:
                file_time = file.split("-")[-1][: -(len(PREVIEW_FRAME_TYPE) + 1)]

                if not file_time:
                    continue

                ts = float(file_time)
            except ValueError:
                continue

            if self.start_time == 0:
                self.start_time = ts

            self.last_output_time = ts
            self.output_frames.append(ts)

    def reset_frame_cache(self, frame_time: float) -> None:
        self.segment_end = (
            (datetime.datetime.now() + datetime.timedelta(hours=1))
            .astimezone(datetime.timezone.utc)
            .replace(minute=0, second=0, microsecond=0)
            .timestamp()
        )
        self.start_time = frame_time
        self.last_output_time = frame_time
        self.output_frames: list[float] = []

    def should_write_frame(
        self,
        current_tracked_objects: list[dict[str, Any]],
        motion_boxes: list[list[int]],
        frame_time: float,
    ) -> bool:
        """Decide if this frame should be added to PREVIEW."""
        if not self.config.record.enabled:
            return False

        active_objs = get_active_objects(
            frame_time, self.config, current_tracked_objects
        )

        preview_output_fps = 2 if any(o["label"] == "car" for o in active_objs) else 1

        # limit output to 1 fps
        if (frame_time - self.last_output_time) < 1 / preview_output_fps:
            return False

        # send frame if a non-stationary object is in a zone
        if len(active_objs) > 0:
            self.last_output_time = frame_time
            return True

        if len(motion_boxes) > 0:
            self.last_output_time = frame_time
            return True

        # ensure that at least 2 frames are written every minute
        if frame_time - self.last_output_time > 30:
            self.last_output_time = frame_time
            return True

        return False

    def write_frame_to_cache(self, frame_time: float, frame: np.ndarray) -> None:
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
        cv2.imwrite(
            get_cache_image_name(self.config.name, frame_time),
            small_frame,
            [
                int(cv2.IMWRITE_WEBP_QUALITY),
                PREVIEW_QUALITY_WEBP[self.config.record.preview.quality],
            ],
        )

    def write_data(
        self,
        current_tracked_objects: list[dict[str, Any]],
        motion_boxes: list[list[int]],
        frame_time: float,
        frame: np.ndarray,
    ) -> None:
        self.offline = False

        # always write the first frame
        if self.start_time == 0:
            self.start_time = frame_time
            self.output_frames.append(frame_time)
            self.write_frame_to_cache(frame_time, frame)
            return

        # check if PREVIEW clip should be generated and cached frames reset
        if frame_time >= self.segment_end:
            if len(self.output_frames) > 0:
                # save last frame to ensure consistent duration
                if self.config.record:
                    self.output_frames.append(frame_time)
                    self.write_frame_to_cache(frame_time, frame)

                # write the preview if any frames exist for this hour
                FFMpegConverter(
                    self.config,
                    self.output_frames,
                    self.requestor,
                ).start()
            else:
                logger.debug(
                    f"Not saving preview for {self.config.name} because there are no saved frames."
                )

            self.reset_frame_cache(frame_time)

            # include first frame to ensure consistent duration
            if self.config.record.enabled:
                self.output_frames.append(frame_time)
                self.write_frame_to_cache(frame_time, frame)

            return
        elif self.should_write_frame(current_tracked_objects, motion_boxes, frame_time):
            self.output_frames.append(frame_time)
            self.write_frame_to_cache(frame_time, frame)
            return

    def flag_offline(self, frame_time: float) -> None:
        if not self.offline:
            self.write_frame_to_cache(
                frame_time,
                get_blank_yuv_frame(
                    self.config.detect.width, self.config.detect.height
                ),
            )
            self.offline = True

        # check if PREVIEW clip should be generated and cached frames reset
        if frame_time >= self.segment_end:
            if len(self.output_frames) == 0:
                # camera has been offline for entire hour
                # we have no preview to create
                self.reset_frame_cache(frame_time)
                return

            old_frame_path = get_cache_image_name(
                self.config.name, self.output_frames[-1]
            )
            new_frame_path = get_cache_image_name(self.config.name, frame_time)
            shutil.copy(old_frame_path, new_frame_path)

            # save last frame to ensure consistent duration
            self.output_frames.append(frame_time)
            FFMpegConverter(
                self.config,
                self.output_frames,
                self.requestor,
            ).start()

            self.reset_frame_cache(frame_time)

    def stop(self) -> None:
        self.config_subscriber.stop()
        self.requestor.stop()


def get_active_objects(
    frame_time: float, camera_config: CameraConfig, all_objects: list[TrackedObject]
) -> list[TrackedObject]:
    """get active objects for detection."""
    return [
        o
        for o in all_objects
        if o["motionless_count"] < camera_config.detect.stationary.threshold
        and o["position_changes"] > 0
        and o["frame_time"] == frame_time
        and not o["false_positive"]
    ]
