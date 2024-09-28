import os
from typing import Optional

from pydantic import Field, PrivateAttr

from frigate.const import CACHE_DIR, CACHE_SEGMENT_FORMAT, REGEX_CAMERA_NAME
from frigate.ffmpeg_presets import (
    parse_preset_hardware_acceleration_decode,
    parse_preset_hardware_acceleration_scale,
    parse_preset_input,
    parse_preset_output_record,
)
from frigate.util.builtin import (
    escape_special_characters,
    generate_color_palette,
    get_ffmpeg_arg_list,
)

from ..base import FrigateBaseModel
from .audio import AudioConfig
from .birdseye import BirdseyeCameraConfig
from .detect import DetectConfig
from .ffmpeg import CameraFfmpegConfig, CameraInput
from .genai import GenAICameraConfig
from .live import CameraLiveConfig
from .motion import MotionConfig
from .mqtt import CameraMqttConfig
from .objects import ObjectConfig
from .onvif import OnvifConfig
from .record import RecordConfig
from .review import ReviewConfig
from .snapshots import SnapshotsConfig
from .timestamp import TimestampStyleConfig
from .ui import CameraUiConfig
from .zone import ZoneConfig

__all__ = ["CameraConfig"]


class CameraConfig(FrigateBaseModel):
    name: Optional[str] = Field(None, title="Camera name.", pattern=REGEX_CAMERA_NAME)
    enabled: bool = Field(default=True, title="Enable camera.")

    # Options with global fallback
    audio: AudioConfig = Field(
        default_factory=AudioConfig, title="Audio events configuration."
    )
    birdseye: BirdseyeCameraConfig = Field(
        default_factory=BirdseyeCameraConfig, title="Birdseye camera configuration."
    )
    detect: DetectConfig = Field(
        default_factory=DetectConfig, title="Object detection configuration."
    )
    ffmpeg: CameraFfmpegConfig = Field(title="FFmpeg configuration for the camera.")
    genai: GenAICameraConfig = Field(
        default_factory=GenAICameraConfig, title="Generative AI configuration."
    )
    live: CameraLiveConfig = Field(
        default_factory=CameraLiveConfig, title="Live playback settings."
    )
    motion: Optional[MotionConfig] = Field(
        None, title="Motion detection configuration."
    )
    objects: ObjectConfig = Field(
        default_factory=ObjectConfig, title="Object configuration."
    )
    record: RecordConfig = Field(
        default_factory=RecordConfig, title="Record configuration."
    )
    review: ReviewConfig = Field(
        default_factory=ReviewConfig, title="Review configuration."
    )
    snapshots: SnapshotsConfig = Field(
        default_factory=SnapshotsConfig, title="Snapshot configuration."
    )
    timestamp_style: TimestampStyleConfig = Field(
        default_factory=TimestampStyleConfig, title="Timestamp style configuration."
    )

    # Options without global fallback
    best_image_timeout: int = Field(
        default=60,
        title="How long to wait for the image with the highest confidence score.",
    )
    mqtt: CameraMqttConfig = Field(
        default_factory=CameraMqttConfig, title="MQTT configuration."
    )
    onvif: OnvifConfig = Field(
        default_factory=OnvifConfig, title="Camera Onvif Configuration."
    )
    ui: CameraUiConfig = Field(
        default_factory=CameraUiConfig, title="Camera UI Modifications."
    )
    webui_url: Optional[str] = Field(
        None,
        title="URL to visit the camera directly from system page",
    )
    zones: dict[str, ZoneConfig] = Field(
        default_factory=dict, title="Zone configuration."
    )

    _ffmpeg_cmds: list[dict[str, list[str]]] = PrivateAttr()

    def __init__(self, **config):
        # Set zone colors
        if "zones" in config:
            colors = generate_color_palette(len(config["zones"]))

            config["zones"] = {
                name: {**z, "color": color}
                for (name, z), color in zip(config["zones"].items(), colors)
            }

        # add roles to the input if there is only one
        if len(config["ffmpeg"]["inputs"]) == 1:
            has_audio = "audio" in config["ffmpeg"]["inputs"][0].get("roles", [])

            config["ffmpeg"]["inputs"][0]["roles"] = [
                "record",
                "detect",
            ]

            if has_audio:
                config["ffmpeg"]["inputs"][0]["roles"].append("audio")

        super().__init__(**config)

    @property
    def frame_shape(self) -> tuple[int, int]:
        return self.detect.height, self.detect.width

    @property
    def frame_shape_yuv(self) -> tuple[int, int]:
        return self.detect.height * 3 // 2, self.detect.width

    @property
    def ffmpeg_cmds(self) -> list[dict[str, list[str]]]:
        return self._ffmpeg_cmds

    def create_ffmpeg_cmds(self):
        if "_ffmpeg_cmds" in self:
            return
        ffmpeg_cmds = []
        for ffmpeg_input in self.ffmpeg.inputs:
            ffmpeg_cmd = self._get_ffmpeg_cmd(ffmpeg_input)
            if ffmpeg_cmd is None:
                continue

            ffmpeg_cmds.append({"roles": ffmpeg_input.roles, "cmd": ffmpeg_cmd})
        self._ffmpeg_cmds = ffmpeg_cmds

    def _get_ffmpeg_cmd(self, ffmpeg_input: CameraInput):
        ffmpeg_output_args = []
        if "detect" in ffmpeg_input.roles:
            detect_args = get_ffmpeg_arg_list(self.ffmpeg.output_args.detect)
            scale_detect_args = parse_preset_hardware_acceleration_scale(
                ffmpeg_input.hwaccel_args or self.ffmpeg.hwaccel_args,
                detect_args,
                self.detect.fps,
                self.detect.width,
                self.detect.height,
            )

            ffmpeg_output_args = scale_detect_args + ffmpeg_output_args + ["pipe:"]

        if "record" in ffmpeg_input.roles and self.record.enabled:
            record_args = get_ffmpeg_arg_list(
                parse_preset_output_record(
                    self.ffmpeg.output_args.record,
                    self.ffmpeg.output_args._force_record_hvc1,
                )
                or self.ffmpeg.output_args.record
            )

            ffmpeg_output_args = (
                record_args
                + [f"{os.path.join(CACHE_DIR, self.name)}@{CACHE_SEGMENT_FORMAT}.mp4"]
                + ffmpeg_output_args
            )

        # if there aren't any outputs enabled for this input
        if len(ffmpeg_output_args) == 0:
            return None

        global_args = get_ffmpeg_arg_list(
            ffmpeg_input.global_args or self.ffmpeg.global_args
        )

        camera_arg = (
            self.ffmpeg.hwaccel_args if self.ffmpeg.hwaccel_args != "auto" else None
        )
        hwaccel_args = get_ffmpeg_arg_list(
            parse_preset_hardware_acceleration_decode(
                ffmpeg_input.hwaccel_args,
                self.detect.fps,
                self.detect.width,
                self.detect.height,
            )
            or ffmpeg_input.hwaccel_args
            or parse_preset_hardware_acceleration_decode(
                camera_arg,
                self.detect.fps,
                self.detect.width,
                self.detect.height,
            )
            or camera_arg
            or []
        )
        input_args = get_ffmpeg_arg_list(
            parse_preset_input(ffmpeg_input.input_args, self.detect.fps)
            or ffmpeg_input.input_args
            or parse_preset_input(self.ffmpeg.input_args, self.detect.fps)
            or self.ffmpeg.input_args
        )

        cmd = (
            [self.ffmpeg.ffmpeg_path]
            + global_args
            + (hwaccel_args if "detect" in ffmpeg_input.roles else [])
            + input_args
            + ["-i", escape_special_characters(ffmpeg_input.path)]
            + ffmpeg_output_args
        )

        return [part for part in cmd if part != ""]
