from enum import Enum
from typing import Union

from pydantic import Field, field_validator, model_validator

from frigate.const import DEFAULT_FFMPEG_VERSION, INCLUDED_FFMPEG_VERSIONS, REGEX_CAMERA_NAME

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

RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT = "preset-record-generic-audio-aac"
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
        title="Detect output arguments",
        description="Default output arguments for detect role streams.",
    )
    record: Union[str, list[str]] = Field(
        default=RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT,
        title="Record output arguments",
        description="Default output arguments for record role streams.",
    )


class FfmpegConfig(FrigateBaseModel):
    path: str = Field(
        default="default",
        title="FFmpeg path",
        description='Path to the FFmpeg binary to use or a version alias ("5.0" or "7.0").',
    )
    global_args: Union[str, list[str]] = Field(
        default=FFMPEG_GLOBAL_ARGS_DEFAULT,
        title="FFmpeg global arguments",
        description="Global arguments passed to FFmpeg processes.",
    )
    hwaccel_args: Union[str, list[str]] = Field(
        default="auto",
        title="Hardware acceleration arguments",
        description="Hardware acceleration arguments for FFmpeg. Provider-specific presets are recommended.",
    )
    input_args: Union[str, list[str]] = Field(
        default=FFMPEG_INPUT_ARGS_DEFAULT,
        title="Input arguments",
        description="Input arguments applied to FFmpeg input streams.",
    )
    output_args: FfmpegOutputArgsConfig = Field(
        default_factory=FfmpegOutputArgsConfig,
        title="Output arguments",
        description="Default output arguments used for different FFmpeg roles such as detect and record.",
    )
    retry_interval: float = Field(
        default=10.0,
        title="FFmpeg retry time",
        description="Seconds to wait before attempting to reconnect a camera stream after failure. Default is 10.",
        gt=0.0,
    )
    apple_compatibility: bool = Field(
        default=False,
        title="Apple compatibility",
        description="Enable HEVC tagging for better Apple player compatibility when recording H.265.",
    )
    gpu: int = Field(
        default=0,
        title="GPU index",
        description="Default GPU index used for hardware acceleration if available.",
    )

    @property
    def ffmpeg_path(self) -> str:
        if self.path == "default":
            return f"/usr/lib/ffmpeg/{DEFAULT_FFMPEG_VERSION}/bin/ffmpeg"
        elif self.path in INCLUDED_FFMPEG_VERSIONS:
            return f"/usr/lib/ffmpeg/{self.path}/bin/ffmpeg"
        else:
            return f"{self.path}/bin/ffmpeg"

    @property
    def ffprobe_path(self) -> str:
        if self.path == "default":
            return f"/usr/lib/ffmpeg/{DEFAULT_FFMPEG_VERSION}/bin/ffprobe"
        elif self.path in INCLUDED_FFMPEG_VERSIONS:
            return f"/usr/lib/ffmpeg/{self.path}/bin/ffprobe"
        else:
            return f"{self.path}/bin/ffprobe"


class CameraRoleEnum(str, Enum):
    audio = "audio"
    record = "record"
    detect = "detect"


class CameraInput(FrigateBaseModel):
    path: EnvString = Field(
        title="Input path",
        description="Camera input stream URL or path.",
    )
    roles: list[CameraRoleEnum] = Field(
        title="Input roles",
        description="Roles for this input stream.",
    )
    global_args: Union[str, list[str]] = Field(
        default_factory=list,
        title="FFmpeg global arguments",
        description="FFmpeg global arguments for this input stream.",
    )
    hwaccel_args: Union[str, list[str]] = Field(
        default_factory=list,
        title="Hardware acceleration arguments",
        description="Hardware acceleration arguments for this input stream.",
    )
    input_args: Union[str, list[str]] = Field(
        default_factory=list,
        title="Input arguments",
        description="Input arguments specific to this stream.",
    )
    record_variant: str | None = Field(
        default=None,
        title="Recording variant",
        description="Optional recording variant label for record role inputs such as main or sub.",
        pattern=REGEX_CAMERA_NAME,
    )

    @model_validator(mode="after")
    def validate_record_variant(self):
        if CameraRoleEnum.record in self.roles:
            if not self.record_variant:
                self.record_variant = "main"
        else:
            self.record_variant = None

        return self


class CameraFfmpegConfig(FfmpegConfig):
    inputs: list[CameraInput] = Field(
        title="Camera inputs",
        description="List of input stream definitions (paths and roles) for this camera.",
    )

    @field_validator("inputs")
    @classmethod
    def validate_roles(cls, v):
        detect_inputs = 0
        audio_inputs = 0
        record_variants: set[str] = set()

        for camera_input in v:
            if CameraRoleEnum.detect in camera_input.roles:
                detect_inputs += 1

            if CameraRoleEnum.audio in camera_input.roles:
                audio_inputs += 1

            if CameraRoleEnum.record in camera_input.roles:
                record_variant = camera_input.record_variant or "main"
                if record_variant in record_variants:
                    raise ValueError(
                        f"Record variant '{record_variant}' may only be used once."
                    )
                record_variants.add(record_variant)

        if detect_inputs != 1:
            raise ValueError("The detect role is required.")

        if audio_inputs > 1:
            raise ValueError("Each input role may only be used once.")

        return v
