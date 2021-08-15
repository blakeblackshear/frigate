from __future__ import annotations

from enum import Enum
import json
import logging
import os
from typing import Dict, List, Optional, Tuple, Union

import matplotlib.pyplot as plt
import numpy as np
from pydantic import BaseModel, Field, validator
from pydantic.fields import PrivateAttr
import yaml

from frigate.const import BASE_DIR, RECORD_DIR, CACHE_DIR
from frigate.edgetpu import load_labels
from frigate.util import create_mask, deep_merge

logger = logging.getLogger(__name__)

# TODO: Identify what the default format to display timestamps is
DEFAULT_TIME_FORMAT = "%m/%d/%Y %H:%M:%S"
# German Style:
# DEFAULT_TIME_FORMAT = "%d.%m.%Y %H:%M:%S"

FRIGATE_ENV_VARS = {k: v for k, v in os.environ.items() if k.startswith("FRIGATE_")}

DEFAULT_TRACKED_OBJECTS = ["person"]
DEFAULT_DETECTORS = {"coral": {"type": "edgetpu", "device": "usb"}}


class DetectorTypeEnum(str, Enum):
    edgetpu = "edgetpu"
    cpu = "cpu"


class DetectorConfig(BaseModel):
    type: DetectorTypeEnum = Field(
        default=DetectorTypeEnum.edgetpu, title="Detector Type"
    )
    device: str = Field(default="usb", title="Device Type")
    num_threads: int = Field(default=3, title="Number of detection threads")


class MqttConfig(BaseModel):
    host: str = Field(title="MQTT Host")
    port: int = Field(default=1883, title="MQTT Port")
    topic_prefix: str = Field(default="frigate", title="MQTT Topic Prefix")
    client_id: str = Field(default="frigate", title="MQTT Client ID")
    stats_interval: int = Field(default=60, title="MQTT Camera Stats Interval")
    user: Optional[str] = Field(title="MQTT Username")
    password: Optional[str] = Field(title="MQTT Password")
    tls_ca_certs: Optional[str] = Field(title="MQTT TLS CA Certificates")
    tls_client_cert: Optional[str] = Field(title="MQTT TLS Client Certificate")
    tls_client_key: Optional[str] = Field(title="MQTT TLS Client Key")
    tls_insecure: Optional[bool] = Field(title="MQTT TLS Insecure")

    @validator("password", pre=True, always=True)
    def validate_password(cls, v, values):
        if (v is None) != (values["user"] is None):
            raise ValueError("Password must be provided with username.")
        return v


class RetainConfig(BaseModel):
    default: int = Field(default=10, title="Default retention period.")
    objects: Dict[str, int] = Field(
        default_factory=dict, title="Object retention period."
    )


# DEPRECATED: Will eventually be removed
class ClipsConfig(BaseModel):
    enabled: bool = Field(default=False, title="Save clips.")
    max_seconds: int = Field(default=300, title="Maximum clip duration.")
    pre_capture: int = Field(default=5, title="Seconds to capture before event starts.")
    post_capture: int = Field(default=5, title="Seconds to capture after event ends.")
    required_zones: List[str] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to save the clip.",
    )
    objects: Optional[List[str]] = Field(
        title="List of objects to be detected in order to save the clip.",
    )
    retain: RetainConfig = Field(
        default_factory=RetainConfig, title="Clip retention settings."
    )


class RecordConfig(BaseModel):
    enabled: bool = Field(default=False, title="Enable record on all cameras.")
    retain_days: int = Field(default=0, title="Recording retention period in days.")
    events: ClipsConfig = Field(
        default_factory=ClipsConfig, title="Event specific settings."
    )


class MotionConfig(BaseModel):
    threshold: int = Field(
        default=25,
        title="Motion detection threshold (1-255).",
        ge=1,
        le=255,
    )
    contour_area: Optional[int] = Field(title="Contour Area")
    delta_alpha: float = Field(default=0.2, title="Delta Alpha")
    frame_alpha: float = Field(default=0.2, title="Frame Alpha")
    frame_height: Optional[int] = Field(title="Frame Height")
    mask: Union[str, List[str]] = Field(
        default="", title="Coordinates polygon for the motion mask."
    )


class RuntimeMotionConfig(MotionConfig):
    raw_mask: Union[str, List[str]] = ""
    mask: np.ndarray = None

    def __init__(self, **config):
        frame_shape = config.get("frame_shape", (1, 1))

        if "frame_height" not in config:
            config["frame_height"] = max(frame_shape[0] // 6, 180)

        if "contour_area" not in config:
            frame_width = frame_shape[1] * config["frame_height"] / frame_shape[0]
            config["contour_area"] = (
                config["frame_height"] * frame_width * 0.00173611111
            )

        mask = config.get("mask", "")
        config["raw_mask"] = mask

        if mask:
            config["mask"] = create_mask(frame_shape, mask)
        else:
            empty_mask = np.zeros(frame_shape, np.uint8)
            empty_mask[:] = 255
            config["mask"] = empty_mask

        super().__init__(**config)

    def dict(self, **kwargs):
        ret = super().dict(**kwargs)
        if "mask" in ret:
            ret["mask"] = ret["raw_mask"]
            ret.pop("raw_mask")
        return ret

    class Config:
        arbitrary_types_allowed = True


class DetectConfig(BaseModel):
    height: int = Field(title="Height of the stream for the detect role.")
    width: int = Field(title="Width of the stream for the detect role.")
    fps: int = Field(title="Number of frames per second to process through detection.")
    enabled: bool = Field(default=True, title="Detection Enabled.")
    max_disappeared: Optional[int] = Field(
        title="Maximum number of frames the object can dissapear before detection ends."
    )


class FilterConfig(BaseModel):
    min_area: int = Field(
        default=0, title="Minimum area of bounding box for object to be counted."
    )
    max_area: int = Field(
        default=24000000, title="Maximum area of bounding box for object to be counted."
    )
    threshold: float = Field(
        default=0.7,
        title="Average detection confidence threshold for object to be counted.",
    )
    min_score: float = Field(
        default=0.5, title="Minimum detection confidence for object to be counted."
    )
    mask: Optional[Union[str, List[str]]] = Field(
        title="Detection area polygon mask for this filter configuration.",
    )


class RuntimeFilterConfig(FilterConfig):
    mask: Optional[np.ndarray]
    raw_mask: Optional[Union[str, List[str]]]

    def __init__(self, **config):
        mask = config.get("mask")
        config["raw_mask"] = mask

        if mask is not None:
            config["mask"] = create_mask(config.get("frame_shape", (1, 1)), mask)

        super().__init__(**config)

    def dict(self, **kwargs):
        ret = super().dict(**kwargs)
        if "mask" in ret:
            ret["mask"] = ret["raw_mask"]
            ret.pop("raw_mask")
        return ret

    class Config:
        arbitrary_types_allowed = True


class ZoneConfig(BaseModel):
    filters: Dict[str, FilterConfig] = Field(
        default_factory=dict, title="Zone filters."
    )
    coordinates: Union[str, List[str]] = Field(
        title="Coordinates polygon for the defined zone."
    )
    objects: List[str] = Field(
        default_factory=list,
        title="List of objects that can trigger the zone.",
    )
    _color: Optional[Tuple[int, int, int]] = PrivateAttr()
    _contour: np.ndarray = PrivateAttr()

    @property
    def color(self) -> Tuple[int, int, int]:
        return self._color

    @property
    def contour(self) -> np.ndarray:
        return self._contour

    def __init__(self, **config):
        super().__init__(**config)

        self._color = config.get("color", (0, 0, 0))
        coordinates = config["coordinates"]

        if isinstance(coordinates, list):
            self._contour = np.array(
                [[int(p.split(",")[0]), int(p.split(",")[1])] for p in coordinates]
            )
        elif isinstance(coordinates, str):
            points = coordinates.split(",")
            self._contour = np.array(
                [[int(points[i]), int(points[i + 1])] for i in range(0, len(points), 2)]
            )
        else:
            self._contour = np.array([])


class ObjectConfig(BaseModel):
    track: List[str] = Field(default=DEFAULT_TRACKED_OBJECTS, title="Objects to track.")
    filters: Optional[Dict[str, FilterConfig]] = Field(title="Object filters.")
    mask: Union[str, List[str]] = Field(default="", title="Object mask.")


class BirdseyeModeEnum(str, Enum):
    objects = "objects"
    motion = "motion"
    continuous = "continuous"


class BirdseyeConfig(BaseModel):
    enabled: bool = Field(default=True, title="Enable birdseye view.")
    width: int = Field(default=1280, title="Birdseye width.")
    height: int = Field(default=720, title="Birdseye height.")
    quality: int = Field(
        default=8,
        title="Encoding quality.",
        ge=1,
        le=31,
    )
    mode: BirdseyeModeEnum = Field(
        default=BirdseyeModeEnum.objects, title="Tracking mode."
    )


FFMPEG_GLOBAL_ARGS_DEFAULT = ["-hide_banner", "-loglevel", "warning"]
FFMPEG_INPUT_ARGS_DEFAULT = [
    "-avoid_negative_ts",
    "make_zero",
    "-fflags",
    "+genpts+discardcorrupt",
    "-rtsp_transport",
    "tcp",
    "-stimeout",
    "5000000",
    "-use_wallclock_as_timestamps",
    "1",
]
DETECT_FFMPEG_OUTPUT_ARGS_DEFAULT = ["-f", "rawvideo", "-pix_fmt", "yuv420p"]
RTMP_FFMPEG_OUTPUT_ARGS_DEFAULT = ["-c", "copy", "-f", "flv"]
RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT = [
    "-f",
    "segment",
    "-segment_time",
    "10",
    "-segment_format",
    "mp4",
    "-reset_timestamps",
    "1",
    "-strftime",
    "1",
    "-c",
    "copy",
    "-an",
]


class FfmpegOutputArgsConfig(BaseModel):
    detect: Union[str, List[str]] = Field(
        default=DETECT_FFMPEG_OUTPUT_ARGS_DEFAULT,
        title="Detect role FFmpeg output arguments.",
    )
    record: Union[str, List[str]] = Field(
        default=RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT,
        title="Record role FFmpeg output arguments.",
    )
    rtmp: Union[str, List[str]] = Field(
        default=RTMP_FFMPEG_OUTPUT_ARGS_DEFAULT,
        title="RTMP role FFmpeg output arguments.",
    )


class FfmpegConfig(BaseModel):
    global_args: Union[str, List[str]] = Field(
        default=FFMPEG_GLOBAL_ARGS_DEFAULT, title="Global FFmpeg arguments."
    )
    hwaccel_args: Union[str, List[str]] = Field(
        default_factory=list, title="FFmpeg hardware acceleration arguments."
    )
    input_args: Union[str, List[str]] = Field(
        default=FFMPEG_INPUT_ARGS_DEFAULT, title="FFmpeg input arguments."
    )
    output_args: FfmpegOutputArgsConfig = Field(
        default_factory=FfmpegOutputArgsConfig,
        title="FFmpeg output arguments per role.",
    )


class CameraInput(BaseModel):
    path: str = Field(title="Camera input path.")
    roles: List[str] = Field(title="Roles assigned to this input.")
    global_args: Union[str, List[str]] = Field(
        default_factory=list, title="FFmpeg global arguments."
    )
    hwaccel_args: Union[str, List[str]] = Field(
        default_factory=list, title="FFmpeg hardware acceleration arguments."
    )
    input_args: Union[str, List[str]] = Field(
        default_factory=list, title="FFmpeg input arguments."
    )


class CameraFfmpegConfig(FfmpegConfig):
    inputs: List[CameraInput] = Field(title="Camera inputs.")

    @validator("inputs")
    def validate_roles(cls, v):
        roles = [role for i in v for role in i.roles]
        roles_set = set(roles)

        if len(roles) > len(roles_set):
            raise ValueError("Each input role may only be used once.")

        if not "detect" in roles:
            raise ValueError("The detect role is required.")

        return v


class CameraSnapshotsConfig(BaseModel):
    enabled: bool = Field(default=False, title="Snapshots enabled.")
    clean_copy: bool = Field(
        default=True, title="Create a clean copy of the snapshot image."
    )
    timestamp: bool = Field(
        default=False, title="Add a timestamp overlay on the snapshot."
    )
    bounding_box: bool = Field(
        default=True, title="Add a bounding box overlay on the snapshot."
    )
    crop: bool = Field(default=False, title="Crop the snapshot to the detected object.")
    required_zones: List[str] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to save a snapshot.",
    )
    height: Optional[int] = Field(title="Snapshot image height.")
    retain: RetainConfig = Field(
        default_factory=RetainConfig, title="Snapshot retention."
    )
    quality: int = Field(
        default=70,
        title="Quality of the encoded jpeg (0-100).",
        ge=0,
        le=100,
    )


class ColorConfig(BaseModel):
    red: int = Field(default=255, le=0, ge=255, title="Red")
    green: int = Field(default=255, le=0, ge=255, title="Green")
    blue: int = Field(default=255, le=0, ge=255, title="Blue")


class TimestampStyleConfig(BaseModel):
    position: str = Field(default="tl", title="Timestamp position.")
    format: str = Field(default=DEFAULT_TIME_FORMAT, title="Timestamp format.")
    color: ColorConfig = Field(default_factory=ColorConfig, title="Timestamp color.")
    scale: float = Field(default=1.0, title="Timestamp scale.")
    thickness: int = Field(default=2, title="Timestamp thickness.")
    effect: Optional[str] = Field(title="Timestamp effect.")


class CameraMqttConfig(BaseModel):
    enabled: bool = Field(default=True, title="Send image over MQTT.")
    timestamp: bool = Field(default=True, title="Add timestamp to MQTT image.")
    bounding_box: bool = Field(default=True, title="Add bounding box to MQTT image.")
    crop: bool = Field(default=True, title="Crop MQTT image to detected object.")
    height: int = Field(default=270, title="MQTT image height.")
    required_zones: List[str] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to send the image.",
    )
    quality: int = Field(
        default=70,
        title="Quality of the encoded jpeg (0-100).",
        ge=0,
        le=100,
    )


class CameraRtmpConfig(BaseModel):
    enabled: bool = Field(default=True, title="RTMP restreaming enabled.")


class CameraLiveConfig(BaseModel):
    height: int = Field(default=720, title="Live camera view height")
    quality: int = Field(default=8, ge=1, le=31, title="Live camera view quality")


class CameraConfig(BaseModel):
    name: Optional[str] = Field(title="Camera name.")
    ffmpeg: CameraFfmpegConfig = Field(title="FFmpeg configuration for the camera.")
    best_image_timeout: int = Field(
        default=60,
        title="How long to wait for the image with the highest confidence score.",
    )
    zones: Dict[str, ZoneConfig] = Field(
        default_factory=dict, title="Zone configuration."
    )
    record: RecordConfig = Field(
        default_factory=RecordConfig, title="Record configuration."
    )
    rtmp: CameraRtmpConfig = Field(
        default_factory=CameraRtmpConfig, title="RTMP restreaming configuration."
    )
    live: Optional[CameraLiveConfig] = Field(title="Live playback settings.")
    snapshots: CameraSnapshotsConfig = Field(
        default_factory=CameraSnapshotsConfig, title="Snapshot configuration."
    )
    mqtt: CameraMqttConfig = Field(
        default_factory=CameraMqttConfig, title="MQTT configuration."
    )
    objects: ObjectConfig = Field(
        default_factory=ObjectConfig, title="Object configuration."
    )
    motion: Optional[MotionConfig] = Field(title="Motion detection configuration.")
    detect: DetectConfig = Field(title="Object detection configuration.")
    timestamp_style: TimestampStyleConfig = Field(
        default_factory=TimestampStyleConfig, title="Timestamp style configuration."
    )

    def __init__(self, **config):
        # Set zone colors
        if "zones" in config:
            colors = plt.cm.get_cmap("tab10", len(config["zones"]))
            config["zones"] = {
                name: {**z, "color": tuple(round(255 * c) for c in colors(idx)[:3])}
                for idx, (name, z) in enumerate(config["zones"].items())
            }

        super().__init__(**config)

    @property
    def frame_shape(self) -> Tuple[int, int]:
        return self.detect.height, self.detect.width

    @property
    def frame_shape_yuv(self) -> Tuple[int, int]:
        return self.detect.height * 3 // 2, self.detect.width

    @property
    def ffmpeg_cmds(self) -> List[Dict[str, List[str]]]:
        ffmpeg_cmds = []
        for ffmpeg_input in self.ffmpeg.inputs:
            ffmpeg_cmd = self._get_ffmpeg_cmd(ffmpeg_input)
            if ffmpeg_cmd is None:
                continue

            ffmpeg_cmds.append({"roles": ffmpeg_input.roles, "cmd": ffmpeg_cmd})
        return ffmpeg_cmds

    def _get_ffmpeg_cmd(self, ffmpeg_input: CameraInput):
        ffmpeg_output_args = []
        if "detect" in ffmpeg_input.roles:
            detect_args = (
                self.ffmpeg.output_args.detect
                if isinstance(self.ffmpeg.output_args.detect, list)
                else self.ffmpeg.output_args.detect.split(" ")
            )
            ffmpeg_output_args = (
                [
                    "-r",
                    str(self.detect.fps),
                    "-s",
                    f"{self.detect.width}x{self.detect.height}",
                ]
                + detect_args
                + ffmpeg_output_args
                + ["pipe:"]
            )
        if "rtmp" in ffmpeg_input.roles and self.rtmp.enabled:
            rtmp_args = (
                self.ffmpeg.output_args.rtmp
                if isinstance(self.ffmpeg.output_args.rtmp, list)
                else self.ffmpeg.output_args.rtmp.split(" ")
            )
            ffmpeg_output_args = (
                rtmp_args + [f"rtmp://127.0.0.1/live/{self.name}"] + ffmpeg_output_args
            )
        if "record" in ffmpeg_input.roles and self.record.enabled:
            record_args = (
                self.ffmpeg.output_args.record
                if isinstance(self.ffmpeg.output_args.record, list)
                else self.ffmpeg.output_args.record.split(" ")
            )
            ffmpeg_output_args = (
                record_args
                + [f"{os.path.join(CACHE_DIR, self.name)}-%Y%m%d%H%M%S.mp4"]
                + ffmpeg_output_args
            )

        # if there arent any outputs enabled for this input
        if len(ffmpeg_output_args) == 0:
            return None

        global_args = ffmpeg_input.global_args or self.ffmpeg.global_args
        hwaccel_args = ffmpeg_input.hwaccel_args or self.ffmpeg.hwaccel_args
        input_args = ffmpeg_input.input_args or self.ffmpeg.input_args

        global_args = (
            global_args if isinstance(global_args, list) else global_args.split(" ")
        )
        hwaccel_args = (
            hwaccel_args if isinstance(hwaccel_args, list) else hwaccel_args.split(" ")
        )
        input_args = (
            input_args if isinstance(input_args, list) else input_args.split(" ")
        )

        cmd = (
            ["ffmpeg"]
            + global_args
            + hwaccel_args
            + input_args
            + ["-i", ffmpeg_input.path]
            + ffmpeg_output_args
        )

        return [part for part in cmd if part != ""]


class DatabaseConfig(BaseModel):
    path: str = Field(
        default=os.path.join(BASE_DIR, "frigate.db"), title="Database path."
    )


class ModelConfig(BaseModel):
    width: int = Field(default=320, title="Object detection model input width.")
    height: int = Field(default=320, title="Object detection model input height.")
    labelmap: Dict[int, str] = Field(
        default_factory=dict, title="Labelmap customization."
    )
    _merged_labelmap: Optional[Dict[int, str]] = PrivateAttr()

    @property
    def merged_labelmap(self) -> Dict[int, str]:
        return self._merged_labelmap

    def __init__(self, **config):
        super().__init__(**config)

        self._merged_labelmap = {
            **load_labels("/labelmap.txt"),
            **config.get("labelmap", {}),
        }


class LogLevelEnum(str, Enum):
    debug = "debug"
    info = "info"
    warning = "warning"
    error = "error"
    critical = "critical"


class LoggerConfig(BaseModel):
    default: LogLevelEnum = Field(
        default=LogLevelEnum.info, title="Default logging level."
    )
    logs: Dict[str, LogLevelEnum] = Field(
        default_factory=dict, title="Log level for specified processes."
    )


class SnapshotsConfig(BaseModel):
    retain: RetainConfig = Field(
        default_factory=RetainConfig, title="Global snapshot retention configuration."
    )


class FrigateConfig(BaseModel):
    mqtt: MqttConfig = Field(title="MQTT Configuration.")
    database: DatabaseConfig = Field(
        default_factory=DatabaseConfig, title="Database configuration."
    )
    environment_vars: Dict[str, str] = Field(
        default_factory=dict, title="Frigate environment variables."
    )
    model: ModelConfig = Field(
        default_factory=ModelConfig, title="Detection model configuration."
    )
    detectors: Dict[str, DetectorConfig] = Field(
        default={name: DetectorConfig(**d) for name, d in DEFAULT_DETECTORS.items()},
        title="Detector hardware configuration.",
    )
    logger: LoggerConfig = Field(
        default_factory=LoggerConfig, title="Logging configuration."
    )
    record: RecordConfig = Field(
        default_factory=RecordConfig, title="Global record configuration."
    )
    snapshots: SnapshotsConfig = Field(
        default_factory=SnapshotsConfig, title="Global snapshots configuration."
    )
    birdseye: BirdseyeConfig = Field(
        default_factory=BirdseyeConfig, title="Birdseye configuration."
    )
    ffmpeg: FfmpegConfig = Field(
        default_factory=FfmpegConfig, title="Global FFmpeg configuration."
    )
    objects: ObjectConfig = Field(
        default_factory=ObjectConfig, title="Global object configuration."
    )
    motion: Optional[MotionConfig] = Field(
        title="Global motion detection configuration."
    )
    detect: Optional[DetectConfig] = Field(
        title="Global object tracking configuration."
    )
    cameras: Dict[str, CameraConfig] = Field(title="Camera configuration.")

    @property
    def runtime_config(self) -> FrigateConfig:
        """Merge camera config with globals."""
        config = self.copy(deep=True)

        # MQTT password substitution
        if config.mqtt.password:
            config.mqtt.password = config.mqtt.password.format(**FRIGATE_ENV_VARS)

        # Global config to propegate down to camera level
        global_config = config.dict(
            include={
                "record": ...,
                "snapshots": ...,
                "objects": ...,
                "motion": ...,
                "detect": ...,
                "ffmpeg": ...,
            },
            exclude_unset=True,
        )

        for name, camera in config.cameras.items():
            merged_config = deep_merge(camera.dict(exclude_unset=True), global_config)
            camera_config: CameraConfig = CameraConfig.parse_obj(
                {"name": name, **merged_config}
            )

            # FFMPEG input substitution
            for input in camera_config.ffmpeg.inputs:
                input.path = input.path.format(**FRIGATE_ENV_VARS)

            # Add default filters
            object_keys = camera_config.objects.track
            if camera_config.objects.filters is None:
                camera_config.objects.filters = {}
            object_keys = object_keys - camera_config.objects.filters.keys()
            for key in object_keys:
                camera_config.objects.filters[key] = FilterConfig()

            # Apply global object masks and convert masks to numpy array
            for object, filter in camera_config.objects.filters.items():
                if camera_config.objects.mask:
                    filter_mask = []
                    if filter.mask is not None:
                        filter_mask = (
                            filter.mask
                            if isinstance(filter.mask, list)
                            else [filter.mask]
                        )
                    object_mask = (
                        camera_config.objects.mask
                        if isinstance(camera_config.objects.mask, list)
                        else [camera_config.objects.mask]
                    )
                    filter.mask = filter_mask + object_mask

                # Set runtime filter to create masks
                camera_config.objects.filters[object] = RuntimeFilterConfig(
                    frame_shape=camera_config.frame_shape,
                    **filter.dict(exclude_unset=True),
                )

            # Convert motion configuration
            if camera_config.motion is None:
                camera_config.motion = RuntimeMotionConfig(
                    frame_shape=camera_config.frame_shape
                )
            else:
                camera_config.motion = RuntimeMotionConfig(
                    frame_shape=camera_config.frame_shape,
                    raw_mask=camera_config.motion.mask,
                    **camera_config.motion.dict(exclude_unset=True),
                )

            # Default detect configuration
            max_disappeared = camera_config.detect.fps * 5
            if camera_config.detect.max_disappeared is None:
                camera_config.detect.max_disappeared = max_disappeared

            # Default live configuration
            if camera_config.live is None:
                camera_config.live = CameraLiveConfig()

            config.cameras[name] = camera_config

        return config

    @validator("cameras")
    def ensure_zones_and_cameras_have_different_names(cls, v: Dict[str, CameraConfig]):
        zones = [zone for camera in v.values() for zone in camera.zones.keys()]
        for zone in zones:
            if zone in v.keys():
                raise ValueError("Zones cannot share names with cameras")
        return v

    @classmethod
    def parse_file(cls, config_file):
        with open(config_file) as f:
            raw_config = f.read()

        if config_file.endswith(".yml"):
            config = yaml.safe_load(raw_config)
        elif config_file.endswith(".json"):
            config = json.loads(raw_config)

        return cls.parse_obj(config)
