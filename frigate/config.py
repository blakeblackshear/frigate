from __future__ import annotations

import json
import logging
import os
from enum import Enum
from typing import Dict, List, Optional, Tuple, Union

import matplotlib.pyplot as plt
import numpy as np
import yaml
from pydantic import BaseModel, Extra, Field, validator
from pydantic.fields import PrivateAttr

from frigate.const import BASE_DIR, CACHE_DIR, YAML_EXT
from frigate.util import create_mask, deep_merge, load_labels

logger = logging.getLogger(__name__)

# TODO: Identify what the default format to display timestamps is
DEFAULT_TIME_FORMAT = "%m/%d/%Y %H:%M:%S"
# German Style:
# DEFAULT_TIME_FORMAT = "%d.%m.%Y %H:%M:%S"

FRIGATE_ENV_VARS = {k: v for k, v in os.environ.items() if k.startswith("FRIGATE_")}

DEFAULT_TRACKED_OBJECTS = ["person"]
DEFAULT_DETECTORS = {"cpu": {"type": "cpu"}}


class FrigateBaseModel(BaseModel):
    class Config:
        extra = Extra.forbid


class DetectorTypeEnum(str, Enum):
    edgetpu = "edgetpu"
    cpu = "cpu"


class DetectorConfig(FrigateBaseModel):
    type: DetectorTypeEnum = Field(default=DetectorTypeEnum.cpu, title="Detector Type")
    device: str = Field(default="usb", title="Device Type")
    num_threads: int = Field(default=3, title="Number of detection threads")


class MqttConfig(FrigateBaseModel):
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


class RetainModeEnum(str, Enum):
    all = "all"
    motion = "motion"
    active_objects = "active_objects"


class RetainConfig(FrigateBaseModel):
    default: float = Field(default=10, title="Default retention period.")
    mode: RetainModeEnum = Field(
        default=RetainModeEnum.active_objects, title="Retain mode."
    )
    objects: Dict[str, float] = Field(
        default_factory=dict, title="Object retention period."
    )


class EventsConfig(FrigateBaseModel):
    max_seconds: int = Field(default=300, title="Maximum event duration.")
    pre_capture: int = Field(default=5, title="Seconds to retain before event starts.")
    post_capture: int = Field(default=5, title="Seconds to retain after event ends.")
    required_zones: List[str] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to save the event.",
    )
    objects: Optional[List[str]] = Field(
        title="List of objects to be detected in order to save the event.",
    )
    retain: RetainConfig = Field(
        default_factory=RetainConfig, title="Event retention settings."
    )


class RecordRetainConfig(FrigateBaseModel):
    days: float = Field(default=0, title="Default retention period.")
    mode: RetainModeEnum = Field(default=RetainModeEnum.all, title="Retain mode.")


class RecordConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable record on all cameras.")
    # deprecated - to be removed in a future version
    retain_days: Optional[float] = Field(title="Recording retention period in days.")
    retain: RecordRetainConfig = Field(
        default_factory=RecordRetainConfig, title="Record retention settings."
    )
    events: EventsConfig = Field(
        default_factory=EventsConfig, title="Event specific settings."
    )


class MotionConfig(FrigateBaseModel):
    threshold: int = Field(
        default=25,
        title="Motion detection threshold (1-255).",
        ge=1,
        le=255,
    )
    contour_area: Optional[int] = Field(default=30, title="Contour Area")
    delta_alpha: float = Field(default=0.2, title="Delta Alpha")
    frame_alpha: float = Field(default=0.2, title="Frame Alpha")
    frame_height: Optional[int] = Field(default=50, title="Frame Height")
    mask: Union[str, List[str]] = Field(
        default="", title="Coordinates polygon for the motion mask."
    )


class RuntimeMotionConfig(MotionConfig):
    raw_mask: Union[str, List[str]] = ""
    mask: np.ndarray = None

    def __init__(self, **config):
        frame_shape = config.get("frame_shape", (1, 1))

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
        extra = Extra.ignore


class DetectConfig(FrigateBaseModel):
    height: int = Field(default=720, title="Height of the stream for the detect role.")
    width: int = Field(default=1280, title="Width of the stream for the detect role.")
    fps: int = Field(
        default=5, title="Number of frames per second to process through detection."
    )
    enabled: bool = Field(default=True, title="Detection Enabled.")
    max_disappeared: Optional[int] = Field(
        title="Maximum number of frames the object can dissapear before detection ends."
    )
    stationary_interval: Optional[int] = Field(
        title="Frame interval for checking stationary objects.",
        ge=1,
    )


class FilterConfig(FrigateBaseModel):
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
        extra = Extra.ignore


# this uses the base model because the color is an extra attribute
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


class ObjectConfig(FrigateBaseModel):
    track: List[str] = Field(default=DEFAULT_TRACKED_OBJECTS, title="Objects to track.")
    filters: Optional[Dict[str, FilterConfig]] = Field(title="Object filters.")
    mask: Union[str, List[str]] = Field(default="", title="Object mask.")


class BirdseyeModeEnum(str, Enum):
    objects = "objects"
    motion = "motion"
    continuous = "continuous"


class BirdseyeConfig(FrigateBaseModel):
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


class FfmpegOutputArgsConfig(FrigateBaseModel):
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


class FfmpegConfig(FrigateBaseModel):
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


class CameraRoleEnum(str, Enum):
    record = "record"
    rtmp = "rtmp"
    detect = "detect"


class CameraInput(FrigateBaseModel):
    path: str = Field(title="Camera input path.")
    roles: List[CameraRoleEnum] = Field(title="Roles assigned to this input.")
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


class SnapshotsConfig(FrigateBaseModel):
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


class ColorConfig(FrigateBaseModel):
    red: int = Field(default=255, ge=0, le=255, title="Red")
    green: int = Field(default=255, ge=0, le=255, title="Green")
    blue: int = Field(default=255, ge=0, le=255, title="Blue")


class TimestampPositionEnum(str, Enum):
    tl = "tl"
    tr = "tr"
    bl = "bl"
    br = "br"


class TimestampEffectEnum(str, Enum):
    solid = "solid"
    shadow = "shadow"


class TimestampStyleConfig(FrigateBaseModel):
    position: TimestampPositionEnum = Field(
        default=TimestampPositionEnum.tl, title="Timestamp position."
    )
    format: str = Field(default=DEFAULT_TIME_FORMAT, title="Timestamp format.")
    color: ColorConfig = Field(default_factory=ColorConfig, title="Timestamp color.")
    thickness: int = Field(default=2, title="Timestamp thickness.")
    effect: Optional[TimestampEffectEnum] = Field(title="Timestamp effect.")


class CameraMqttConfig(FrigateBaseModel):
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


class RtmpConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="RTMP restreaming enabled.")


class CameraLiveConfig(FrigateBaseModel):
    height: int = Field(default=720, title="Live camera view height")
    quality: int = Field(default=8, ge=1, le=31, title="Live camera view quality")


class CameraConfig(FrigateBaseModel):
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
    rtmp: RtmpConfig = Field(
        default_factory=RtmpConfig, title="RTMP restreaming configuration."
    )
    live: CameraLiveConfig = Field(
        default_factory=CameraLiveConfig, title="Live playback settings."
    )
    snapshots: SnapshotsConfig = Field(
        default_factory=SnapshotsConfig, title="Snapshot configuration."
    )
    mqtt: CameraMqttConfig = Field(
        default_factory=CameraMqttConfig, title="MQTT configuration."
    )
    objects: ObjectConfig = Field(
        default_factory=ObjectConfig, title="Object configuration."
    )
    motion: Optional[MotionConfig] = Field(title="Motion detection configuration.")
    detect: DetectConfig = Field(
        default_factory=DetectConfig, title="Object detection configuration."
    )
    timestamp_style: TimestampStyleConfig = Field(
        default_factory=TimestampStyleConfig, title="Timestamp style configuration."
    )
    _ffmpeg_cmds: List[Dict[str, List[str]]] = PrivateAttr()

    def __init__(self, **config):
        # Set zone colors
        if "zones" in config:
            colors = plt.cm.get_cmap("tab10", len(config["zones"]))
            config["zones"] = {
                name: {**z, "color": tuple(round(255 * c) for c in colors(idx)[:3])}
                for idx, (name, z) in enumerate(config["zones"].items())
            }

        # add roles to the input if there is only one
        if len(config["ffmpeg"]["inputs"]) == 1:
            config["ffmpeg"]["inputs"][0]["roles"] = ["record", "rtmp", "detect"]

        super().__init__(**config)

    @property
    def frame_shape(self) -> Tuple[int, int]:
        return self.detect.height, self.detect.width

    @property
    def frame_shape_yuv(self) -> Tuple[int, int]:
        return self.detect.height * 3 // 2, self.detect.width

    @property
    def ffmpeg_cmds(self) -> List[Dict[str, List[str]]]:
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


class DatabaseConfig(FrigateBaseModel):
    path: str = Field(
        default=os.path.join(BASE_DIR, "frigate.db"), title="Database path."
    )


class ModelConfig(FrigateBaseModel):
    path: Optional[str] = Field(title="Custom Object detection model path.")
    labelmap_path: Optional[str] = Field(title="Label map for custom object detector.")
    width: int = Field(default=320, title="Object detection model input width.")
    height: int = Field(default=320, title="Object detection model input height.")
    labelmap: Dict[int, str] = Field(
        default_factory=dict, title="Labelmap customization."
    )
    _merged_labelmap: Optional[Dict[int, str]] = PrivateAttr()
    _colormap: Dict[int, Tuple[int, int, int]] = PrivateAttr()

    @property
    def merged_labelmap(self) -> Dict[int, str]:
        return self._merged_labelmap

    @property
    def colormap(self) -> Dict[int, Tuple[int, int, int]]:
        return self._colormap

    def __init__(self, **config):
        super().__init__(**config)

        self._merged_labelmap = {
            **load_labels(config.get("labelmap_path", "/labelmap.txt")),
            **config.get("labelmap", {}),
        }

        cmap = plt.cm.get_cmap("tab10", len(self._merged_labelmap.keys()))

        self._colormap = {}
        for key, val in self._merged_labelmap.items():
            self._colormap[val] = tuple(int(round(255 * c)) for c in cmap(key)[:3])


class LogLevelEnum(str, Enum):
    debug = "debug"
    info = "info"
    warning = "warning"
    error = "error"
    critical = "critical"


class LoggerConfig(FrigateBaseModel):
    default: LogLevelEnum = Field(
        default=LogLevelEnum.info, title="Default logging level."
    )
    logs: Dict[str, LogLevelEnum] = Field(
        default_factory=dict, title="Log level for specified processes."
    )


class FrigateConfig(FrigateBaseModel):
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
    live: CameraLiveConfig = Field(
        default_factory=CameraLiveConfig, title="Global live configuration."
    )
    rtmp: RtmpConfig = Field(
        default_factory=RtmpConfig, title="Global RTMP restreaming configuration."
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
    detect: DetectConfig = Field(
        default_factory=DetectConfig, title="Global object tracking configuration."
    )
    cameras: Dict[str, CameraConfig] = Field(title="Camera configuration.")
    timestamp_style: TimestampStyleConfig = Field(
        default_factory=TimestampStyleConfig,
        title="Global timestamp style configuration.",
    )

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
                "live": ...,
                "rtmp": ...,
                "objects": ...,
                "motion": ...,
                "detect": ...,
                "ffmpeg": ...,
                "timestamp_style": ...,
            },
            exclude_unset=True,
        )

        for name, camera in config.cameras.items():
            merged_config = deep_merge(camera.dict(exclude_unset=True), global_config)
            camera_config: CameraConfig = CameraConfig.parse_obj(
                {"name": name, **merged_config}
            )

            # Default max_disappeared configuration
            max_disappeared = camera_config.detect.fps * 5
            if camera_config.detect.max_disappeared is None:
                camera_config.detect.max_disappeared = max_disappeared

            # Default stationary_interval configuration
            stationary_interval = camera_config.detect.fps * 10
            if camera_config.detect.stationary_interval is None:
                camera_config.detect.stationary_interval = stationary_interval

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

            # check runtime config
            assigned_roles = list(
                set([r for i in camera_config.ffmpeg.inputs for r in i.roles])
            )
            if camera_config.record.enabled and not "record" in assigned_roles:
                raise ValueError(
                    f"Camera {name} has record enabled, but record is not assigned to an input."
                )

            if camera_config.rtmp.enabled and not "rtmp" in assigned_roles:
                raise ValueError(
                    f"Camera {name} has rtmp enabled, but rtmp is not assigned to an input."
                )

            # backwards compatibility for retain_days
            if not camera_config.record.retain_days is None:
                logger.warning(
                    "The 'retain_days' config option has been DEPRECATED and will be removed in a future version. Please use the 'days' setting under 'retain'"
                )
                if camera_config.record.retain.days == 0:
                    camera_config.record.retain.days = camera_config.record.retain_days

            # warning if the higher level record mode is potentially more restrictive than the events
            if (
                camera_config.record.retain.days != 0
                and camera_config.record.retain.mode != RetainModeEnum.all
                and camera_config.record.events.retain.mode
                != camera_config.record.retain.mode
            ):
                logger.warning(
                    f"Recording retention is configured for {camera_config.record.retain.mode} and event retention is configured for {camera_config.record.events.retain.mode}. The more restrictive retention policy will be applied."
                )
            # generage the ffmpeg commands
            camera_config.create_ffmpeg_cmds()
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

        if config_file.endswith(YAML_EXT):
            config = yaml.safe_load(raw_config)
        elif config_file.endswith(".json"):
            config = json.loads(raw_config)

        return cls.parse_obj(config)
