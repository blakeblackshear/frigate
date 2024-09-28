import shutil
from enum import Enum
from typing import Union

from pydantic import Field, PrivateAttr, field_validator

from frigate.const import DEFAULT_FFMPEG_VERSION, INCLUDED_FFMPEG_VERSIONS

from ..base import FrigateBaseModel
from ..env import EnvString

__all__ = [
    "CameraFfmpegConfig",
    "CameraInput",
    "CameraRoleEnum",
    "FfmpegConfig",
    "FfmpegOutputArgsConfig",
]

# Note: Setting threads to less than 2 caused several issues with recording segments
# https://github.com/blakeblackshear/frigate/issues/5659
FFMPEG_GLOBAL_ARGS_DEFAULT = ["-hide_banner", "-loglevel", "warning", "-threads", "2"]
FFMPEG_INPUT_ARGS_DEFAULT = "preset-rtsp-generic"

RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT = "preset-record-generic"
DETECT_FFMPEG_OUTPUT_ARGS_DEFAULT = [
    "-threads",
    "2",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "yuv420p",
]


class FfmpegOutputArgsConfig(FrigateBaseModel):
    detect: Union[str, list[str]] = Field(
        default=DETECT_FFMPEG_OUTPUT_ARGS_DEFAULT,
        title="Detect role FFmpeg output arguments.",
    )
    record: Union[str, list[str]] = Field(
        default=RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT,
        title="Record role FFmpeg output arguments.",
    )
    _force_record_hvc1: bool = PrivateAttr(default=False)


class FfmpegConfig(FrigateBaseModel):
    path: str = Field(default="default", title="FFmpeg path")
    global_args: Union[str, list[str]] = Field(
        default=FFMPEG_GLOBAL_ARGS_DEFAULT, title="Global FFmpeg arguments."
    )
    hwaccel_args: Union[str, list[str]] = Field(
        default="auto", title="FFmpeg hardware acceleration arguments."
    )
    input_args: Union[str, list[str]] = Field(
        default=FFMPEG_INPUT_ARGS_DEFAULT, title="FFmpeg input arguments."
    )
    output_args: FfmpegOutputArgsConfig = Field(
        default_factory=FfmpegOutputArgsConfig,
        title="FFmpeg output arguments per role.",
    )
    retry_interval: float = Field(
        default=10.0,
        title="Time in seconds to wait before FFmpeg retries connecting to the camera.",
    )

    @property
    def ffmpeg_path(self) -> str:
        if self.path == "default":
            if shutil.which("ffmpeg") is None:
                return f"/usr/lib/ffmpeg/{DEFAULT_FFMPEG_VERSION}/bin/ffmpeg"
            else:
                return "ffmpeg"
        elif self.path in INCLUDED_FFMPEG_VERSIONS:
            return f"/usr/lib/ffmpeg/{self.path}/bin/ffmpeg"
        else:
            return f"{self.path}/bin/ffmpeg"

    @property
    def ffprobe_path(self) -> str:
        if self.path == "default":
            if shutil.which("ffprobe") is None:
                return f"/usr/lib/ffmpeg/{DEFAULT_FFMPEG_VERSION}/bin/ffprobe"
            else:
                return "ffprobe"
        elif self.path in INCLUDED_FFMPEG_VERSIONS:
            return f"/usr/lib/ffmpeg/{self.path}/bin/ffprobe"
        else:
            return f"{self.path}/bin/ffprobe"


class CameraRoleEnum(str, Enum):
    audio = "audio"
    record = "record"
    detect = "detect"


class CameraInput(FrigateBaseModel):
    path: EnvString = Field(title="Camera input path.")
    roles: list[CameraRoleEnum] = Field(title="Roles assigned to this input.")
    global_args: Union[str, list[str]] = Field(
        default_factory=list, title="FFmpeg global arguments."
    )
    hwaccel_args: Union[str, list[str]] = Field(
        default_factory=list, title="FFmpeg hardware acceleration arguments."
    )
    input_args: Union[str, list[str]] = Field(
        default_factory=list, title="FFmpeg input arguments."
    )


class CameraFfmpegConfig(FfmpegConfig):
    inputs: list[CameraInput] = Field(title="Camera inputs.")

    @field_validator("inputs")
    @classmethod
    def validate_roles(cls, v):
        roles = [role for input in v for role in input.roles]

        if len(roles) != len(set(roles)):
            raise ValueError("Each input role may only be used once.")

        if "detect" not in roles:
            raise ValueError("The detect role is required.")

        return v
