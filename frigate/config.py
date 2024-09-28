from __future__ import annotations

import json
import logging
import os
import shutil
from enum import Enum
from pathlib import Path
from typing import Annotated, Any, Dict, List, Optional, Tuple, Union

import numpy as np
from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    TypeAdapter,
    ValidationInfo,
    field_serializer,
    field_validator,
    model_validator,
)
from pydantic.fields import PrivateAttr
from ruamel.yaml import YAML
from typing_extensions import Self

from frigate.const import (
    AUDIO_MIN_CONFIDENCE,
    CACHE_DIR,
    CACHE_SEGMENT_FORMAT,
    DEFAULT_DB_PATH,
    DEFAULT_FFMPEG_VERSION,
    FREQUENCY_STATS_POINTS,
    INCLUDED_FFMPEG_VERSIONS,
    MAX_PRE_CAPTURE,
    REGEX_CAMERA_NAME,
    REGEX_JSON,
)
from frigate.detectors import DetectorConfig, ModelConfig
from frigate.detectors.detector_config import BaseDetectorConfig
from frigate.ffmpeg_presets import (
    parse_preset_hardware_acceleration_decode,
    parse_preset_hardware_acceleration_scale,
    parse_preset_input,
    parse_preset_output_record,
)
from frigate.plus import PlusApi
from frigate.util.builtin import (
    deep_merge,
    escape_special_characters,
    generate_color_palette,
    get_ffmpeg_arg_list,
)
from frigate.util.config import (
    StreamInfoRetriever,
    get_relative_coordinates,
    migrate_frigate_config,
)
from frigate.util.image import create_mask
from frigate.util.services import auto_detect_hwaccel

logger = logging.getLogger(__name__)

yaml = YAML()

DEFAULT_CONFIG_FILES = ["/config/config.yaml", "/config/config.yml"]
DEFAULT_CONFIG = """
mqtt:
  enabled: False

cameras:
  name_of_your_camera: # <------ Name the camera
    enabled: True
    ffmpeg:
      inputs:
        - path: rtsp://10.0.10.10:554/rtsp # <----- The stream you want to use for detection
          roles:
            - detect
    detect:
      enabled: False # <---- disable detection until you have a working camera feed
      width: 1280
      height: 720
"""

# TODO: Identify what the default format to display timestamps is
DEFAULT_TIME_FORMAT = "%m/%d/%Y %H:%M:%S"
# German Style:
# DEFAULT_TIME_FORMAT = "%d.%m.%Y %H:%M:%S"

FRIGATE_ENV_VARS = {k: v for k, v in os.environ.items() if k.startswith("FRIGATE_")}
# read docker secret files as env vars too
if os.path.isdir("/run/secrets") and os.access("/run/secrets", os.R_OK):
    for secret_file in os.listdir("/run/secrets"):
        if secret_file.startswith("FRIGATE_"):
            FRIGATE_ENV_VARS[secret_file] = (
                Path(os.path.join("/run/secrets", secret_file)).read_text().strip()
            )

DEFAULT_TRACKED_OBJECTS = ["person"]
DEFAULT_ALERT_OBJECTS = ["person", "car"]
DEFAULT_LISTEN_AUDIO = ["bark", "fire_alarm", "scream", "speech", "yell"]
DEFAULT_DETECTORS = {"cpu": {"type": "cpu"}}
DEFAULT_DETECT_DIMENSIONS = {"width": 1280, "height": 720}
DEFAULT_TIME_LAPSE_FFMPEG_ARGS = "-vf setpts=0.04*PTS -r 30"

# stream info handler
stream_info_retriever = StreamInfoRetriever()


class FrigateBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class LiveModeEnum(str, Enum):
    jsmpeg = "jsmpeg"
    mse = "mse"
    webrtc = "webrtc"


class TimeFormatEnum(str, Enum):
    browser = "browser"
    hours12 = "12hour"
    hours24 = "24hour"


class DateTimeStyleEnum(str, Enum):
    full = "full"
    long = "long"
    medium = "medium"
    short = "short"


def validate_env_string(v: str) -> str:
    return v.format(**FRIGATE_ENV_VARS)


EnvString = Annotated[str, AfterValidator(validate_env_string)]


class UIConfig(FrigateBaseModel):
    timezone: Optional[str] = Field(default=None, title="Override UI timezone.")
    time_format: TimeFormatEnum = Field(
        default=TimeFormatEnum.browser, title="Override UI time format."
    )
    date_style: DateTimeStyleEnum = Field(
        default=DateTimeStyleEnum.short, title="Override UI dateStyle."
    )
    time_style: DateTimeStyleEnum = Field(
        default=DateTimeStyleEnum.medium, title="Override UI timeStyle."
    )
    strftime_fmt: Optional[str] = Field(
        default=None, title="Override date and time format using strftime syntax."
    )


class TlsConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="Enable TLS for port 8971")


class HeaderMappingConfig(FrigateBaseModel):
    user: str = Field(
        default=None, title="Header name from upstream proxy to identify user."
    )


class ProxyConfig(FrigateBaseModel):
    header_map: HeaderMappingConfig = Field(
        default_factory=HeaderMappingConfig,
        title="Header mapping definitions for proxy user passing.",
    )
    logout_url: Optional[str] = Field(
        default=None, title="Redirect url for logging out with proxy."
    )
    auth_secret: Optional[EnvString] = Field(
        default=None,
        title="Secret value for proxy authentication.",
    )


class AuthConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="Enable authentication")
    reset_admin_password: bool = Field(
        default=False, title="Reset the admin password on startup"
    )
    cookie_name: str = Field(
        default="frigate_token", title="Name for jwt token cookie", pattern=r"^[a-z]_*$"
    )
    cookie_secure: bool = Field(default=False, title="Set secure flag on cookie")
    session_length: int = Field(
        default=86400, title="Session length for jwt session tokens", ge=60
    )
    refresh_time: int = Field(
        default=43200,
        title="Refresh the session if it is going to expire in this many seconds",
        ge=30,
    )
    failed_login_rate_limit: Optional[str] = Field(
        default=None,
        title="Rate limits for failed login attempts.",
    )
    trusted_proxies: List[str] = Field(
        default=[],
        title="Trusted proxies for determining IP address to rate limit",
    )
    # As of Feb 2023, OWASP recommends 600000 iterations for PBKDF2-SHA256
    hash_iterations: int = Field(default=600000, title="Password hash iterations")


class NotificationConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable notifications")
    email: Optional[str] = Field(default=None, title="Email required for push.")
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of notifications."
    )


class StatsConfig(FrigateBaseModel):
    amd_gpu_stats: bool = Field(default=True, title="Enable AMD GPU stats.")
    intel_gpu_stats: bool = Field(default=True, title="Enable Intel GPU stats.")
    network_bandwidth: bool = Field(
        default=False, title="Enable network bandwidth for ffmpeg processes."
    )


class TelemetryConfig(FrigateBaseModel):
    network_interfaces: List[str] = Field(
        default=[],
        title="Enabled network interfaces for bandwidth calculation.",
    )
    stats: StatsConfig = Field(
        default_factory=StatsConfig, title="System Stats Configuration"
    )
    version_check: bool = Field(default=True, title="Enable latest version check.")


class MqttConfig(FrigateBaseModel):
    enabled: bool = Field(title="Enable MQTT Communication.", default=True)
    host: str = Field(default="", title="MQTT Host")
    port: int = Field(default=1883, title="MQTT Port")
    topic_prefix: str = Field(default="frigate", title="MQTT Topic Prefix")
    client_id: str = Field(default="frigate", title="MQTT Client ID")
    stats_interval: int = Field(
        default=60, ge=FREQUENCY_STATS_POINTS, title="MQTT Camera Stats Interval"
    )
    user: Optional[EnvString] = Field(None, title="MQTT Username")
    password: Optional[EnvString] = Field(
        None, title="MQTT Password", validate_default=True
    )
    tls_ca_certs: Optional[str] = Field(None, title="MQTT TLS CA Certificates")
    tls_client_cert: Optional[str] = Field(None, title="MQTT TLS Client Certificate")
    tls_client_key: Optional[str] = Field(None, title="MQTT TLS Client Key")
    tls_insecure: Optional[bool] = Field(None, title="MQTT TLS Insecure")

    @field_validator("password")
    def user_requires_pass(cls, v, info: ValidationInfo):
        if (v is None) != (info.data["user"] is None):
            raise ValueError("Password must be provided with username.")
        return v


class ZoomingModeEnum(str, Enum):
    disabled = "disabled"
    absolute = "absolute"
    relative = "relative"


class PtzAutotrackConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable PTZ object autotracking.")
    calibrate_on_startup: bool = Field(
        default=False, title="Perform a camera calibration when Frigate starts."
    )
    zooming: ZoomingModeEnum = Field(
        default=ZoomingModeEnum.disabled, title="Autotracker zooming mode."
    )
    zoom_factor: float = Field(
        default=0.3,
        title="Zooming factor (0.1-0.75).",
        ge=0.1,
        le=0.75,
    )
    track: List[str] = Field(default=DEFAULT_TRACKED_OBJECTS, title="Objects to track.")
    required_zones: List[str] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to begin autotracking.",
    )
    return_preset: str = Field(
        default="home",
        title="Name of camera preset to return to when object tracking is over.",
    )
    timeout: int = Field(
        default=10, title="Seconds to delay before returning to preset."
    )
    movement_weights: Optional[Union[str, List[str]]] = Field(
        default=[],
        title="Internal value used for PTZ movements based on the speed of your camera's motor.",
    )
    enabled_in_config: Optional[bool] = Field(
        None, title="Keep track of original state of autotracking."
    )

    @field_validator("movement_weights", mode="before")
    @classmethod
    def validate_weights(cls, v):
        if v is None:
            return None

        if isinstance(v, str):
            weights = list(map(str, map(float, v.split(","))))
        elif isinstance(v, list):
            weights = [str(float(val)) for val in v]
        else:
            raise ValueError("Invalid type for movement_weights")

        if len(weights) != 5:
            raise ValueError("movement_weights must have exactly 5 floats")

        return weights


class OnvifConfig(FrigateBaseModel):
    host: str = Field(default="", title="Onvif Host")
    port: int = Field(default=8000, title="Onvif Port")
    user: Optional[EnvString] = Field(None, title="Onvif Username")
    password: Optional[EnvString] = Field(None, title="Onvif Password")
    autotracking: PtzAutotrackConfig = Field(
        default_factory=PtzAutotrackConfig,
        title="PTZ auto tracking config.",
    )
    ignore_time_mismatch: bool = Field(
        default=False,
        title="Onvif Ignore Time Synchronization Mismatch Between Camera and Server",
    )


class RetainModeEnum(str, Enum):
    all = "all"
    motion = "motion"
    active_objects = "active_objects"


class RecordRetainConfig(FrigateBaseModel):
    days: float = Field(default=0, title="Default retention period.")
    mode: RetainModeEnum = Field(default=RetainModeEnum.all, title="Retain mode.")


class ReviewRetainConfig(FrigateBaseModel):
    days: float = Field(default=10, title="Default retention period.")
    mode: RetainModeEnum = Field(default=RetainModeEnum.motion, title="Retain mode.")


class EventsConfig(FrigateBaseModel):
    pre_capture: int = Field(
        default=5, title="Seconds to retain before event starts.", le=MAX_PRE_CAPTURE
    )
    post_capture: int = Field(default=5, title="Seconds to retain after event ends.")
    retain: ReviewRetainConfig = Field(
        default_factory=ReviewRetainConfig, title="Event retention settings."
    )


class RecordExportConfig(FrigateBaseModel):
    timelapse_args: str = Field(
        default=DEFAULT_TIME_LAPSE_FFMPEG_ARGS, title="Timelapse Args"
    )


class RecordQualityEnum(str, Enum):
    very_low = "very_low"
    low = "low"
    medium = "medium"
    high = "high"
    very_high = "very_high"


class RecordPreviewConfig(FrigateBaseModel):
    quality: RecordQualityEnum = Field(
        default=RecordQualityEnum.medium, title="Quality of recording preview."
    )


class RecordConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable record on all cameras.")
    sync_recordings: bool = Field(
        default=False, title="Sync recordings with disk on startup and once a day."
    )
    expire_interval: int = Field(
        default=60,
        title="Number of minutes to wait between cleanup runs.",
    )
    retain: RecordRetainConfig = Field(
        default_factory=RecordRetainConfig, title="Record retention settings."
    )
    detections: EventsConfig = Field(
        default_factory=EventsConfig, title="Detection specific retention settings."
    )
    alerts: EventsConfig = Field(
        default_factory=EventsConfig, title="Alert specific retention settings."
    )
    export: RecordExportConfig = Field(
        default_factory=RecordExportConfig, title="Recording Export Config"
    )
    preview: RecordPreviewConfig = Field(
        default_factory=RecordPreviewConfig, title="Recording Preview Config"
    )
    enabled_in_config: Optional[bool] = Field(
        None, title="Keep track of original state of recording."
    )


class MotionConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="Enable motion on all cameras.")
    threshold: int = Field(
        default=30,
        title="Motion detection threshold (1-255).",
        ge=1,
        le=255,
    )
    lightning_threshold: float = Field(
        default=0.8, title="Lightning detection threshold (0.3-1.0).", ge=0.3, le=1.0
    )
    improve_contrast: bool = Field(default=True, title="Improve Contrast")
    contour_area: Optional[int] = Field(default=10, title="Contour Area")
    delta_alpha: float = Field(default=0.2, title="Delta Alpha")
    frame_alpha: float = Field(default=0.01, title="Frame Alpha")
    frame_height: Optional[int] = Field(default=100, title="Frame Height")
    mask: Union[str, List[str]] = Field(
        default="", title="Coordinates polygon for the motion mask."
    )
    mqtt_off_delay: int = Field(
        default=30,
        title="Delay for updating MQTT with no motion detected.",
    )
    enabled_in_config: Optional[bool] = Field(
        None, title="Keep track of original state of motion detection."
    )
    raw_mask: Union[str, List[str]] = ""

    @field_serializer("mask", when_used="json")
    def serialize_mask(self, value: Any, info):
        return self.raw_mask

    @field_serializer("raw_mask", when_used="json")
    def serialize_raw_mask(self, value: Any, info):
        return None


class RuntimeMotionConfig(MotionConfig):
    raw_mask: Union[str, List[str]] = ""
    mask: np.ndarray = None

    def __init__(self, **config):
        frame_shape = config.get("frame_shape", (1, 1))

        mask = get_relative_coordinates(config.get("mask", ""), frame_shape)
        config["raw_mask"] = mask

        if mask:
            config["mask"] = create_mask(frame_shape, mask)
        else:
            empty_mask = np.zeros(frame_shape, np.uint8)
            empty_mask[:] = 255
            config["mask"] = empty_mask

        super().__init__(**config)

    def dict(self, **kwargs):
        ret = super().model_dump(**kwargs)
        if "mask" in ret:
            ret["mask"] = ret["raw_mask"]
            ret.pop("raw_mask")
        return ret

    @field_serializer("mask", when_used="json")
    def serialize_mask(self, value: Any, info):
        return self.raw_mask

    @field_serializer("raw_mask", when_used="json")
    def serialize_raw_mask(self, value: Any, info):
        return None

    model_config = ConfigDict(arbitrary_types_allowed=True, extra="ignore")


class StationaryMaxFramesConfig(FrigateBaseModel):
    default: Optional[int] = Field(None, title="Default max frames.", ge=1)
    objects: Dict[str, int] = Field(
        default_factory=dict, title="Object specific max frames."
    )


class StationaryConfig(FrigateBaseModel):
    interval: Optional[int] = Field(
        None,
        title="Frame interval for checking stationary objects.",
        gt=0,
    )
    threshold: Optional[int] = Field(
        None,
        title="Number of frames without a position change for an object to be considered stationary",
        ge=1,
    )
    max_frames: StationaryMaxFramesConfig = Field(
        default_factory=StationaryMaxFramesConfig,
        title="Max frames for stationary objects.",
    )


class DetectConfig(FrigateBaseModel):
    height: Optional[int] = Field(
        None, title="Height of the stream for the detect role."
    )
    width: Optional[int] = Field(None, title="Width of the stream for the detect role.")
    fps: int = Field(
        default=5, title="Number of frames per second to process through detection."
    )
    enabled: bool = Field(default=True, title="Detection Enabled.")
    min_initialized: Optional[int] = Field(
        None,
        title="Minimum number of consecutive hits for an object to be initialized by the tracker.",
    )
    max_disappeared: Optional[int] = Field(
        None,
        title="Maximum number of frames the object can disappear before detection ends.",
    )
    stationary: StationaryConfig = Field(
        default_factory=StationaryConfig,
        title="Stationary objects config.",
    )
    annotation_offset: int = Field(
        default=0, title="Milliseconds to offset detect annotations by."
    )


class FilterConfig(FrigateBaseModel):
    min_area: int = Field(
        default=0, title="Minimum area of bounding box for object to be counted."
    )
    max_area: int = Field(
        default=24000000, title="Maximum area of bounding box for object to be counted."
    )
    min_ratio: float = Field(
        default=0,
        title="Minimum ratio of bounding box's width/height for object to be counted.",
    )
    max_ratio: float = Field(
        default=24000000,
        title="Maximum ratio of bounding box's width/height for object to be counted.",
    )
    threshold: float = Field(
        default=0.7,
        title="Average detection confidence threshold for object to be counted.",
    )
    min_score: float = Field(
        default=0.5, title="Minimum detection confidence for object to be counted."
    )
    mask: Optional[Union[str, List[str]]] = Field(
        None,
        title="Detection area polygon mask for this filter configuration.",
    )
    raw_mask: Union[str, List[str]] = ""

    @field_serializer("mask", when_used="json")
    def serialize_mask(self, value: Any, info):
        return self.raw_mask

    @field_serializer("raw_mask", when_used="json")
    def serialize_raw_mask(self, value: Any, info):
        return None


class AudioFilterConfig(FrigateBaseModel):
    threshold: float = Field(
        default=0.8,
        ge=AUDIO_MIN_CONFIDENCE,
        lt=1.0,
        title="Minimum detection confidence threshold for audio to be counted.",
    )


class RuntimeFilterConfig(FilterConfig):
    mask: Optional[np.ndarray] = None
    raw_mask: Optional[Union[str, List[str]]] = None

    def __init__(self, **config):
        frame_shape = config.get("frame_shape", (1, 1))
        mask = get_relative_coordinates(config.get("mask"), frame_shape)

        config["raw_mask"] = mask

        if mask is not None:
            config["mask"] = create_mask(frame_shape, mask)

        super().__init__(**config)

    def dict(self, **kwargs):
        ret = super().model_dump(**kwargs)
        if "mask" in ret:
            ret["mask"] = ret["raw_mask"]
            ret.pop("raw_mask")
        return ret

    model_config = ConfigDict(arbitrary_types_allowed=True, extra="ignore")


# this uses the base model because the color is an extra attribute
class ZoneConfig(BaseModel):
    filters: Dict[str, FilterConfig] = Field(
        default_factory=dict, title="Zone filters."
    )
    coordinates: Union[str, List[str]] = Field(
        title="Coordinates polygon for the defined zone."
    )
    inertia: int = Field(
        default=3,
        title="Number of consecutive frames required for object to be considered present in the zone.",
        gt=0,
    )
    loitering_time: int = Field(
        default=0,
        ge=0,
        title="Number of seconds that an object must loiter to be considered in the zone.",
    )
    objects: Union[str, List[str]] = Field(
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

    @field_validator("objects", mode="before")
    @classmethod
    def validate_objects(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v

    def __init__(self, **config):
        super().__init__(**config)

        self._color = config.get("color", (0, 0, 0))
        self._contour = config.get("contour", np.array([]))

    def generate_contour(self, frame_shape: tuple[int, int]):
        coordinates = self.coordinates

        # masks and zones are saved as relative coordinates
        # we know if any points are > 1 then it is using the
        # old native resolution coordinates
        if isinstance(coordinates, list):
            explicit = any(p.split(",")[0] > "1.0" for p in coordinates)
            try:
                self._contour = np.array(
                    [
                        (
                            [int(p.split(",")[0]), int(p.split(",")[1])]
                            if explicit
                            else [
                                int(float(p.split(",")[0]) * frame_shape[1]),
                                int(float(p.split(",")[1]) * frame_shape[0]),
                            ]
                        )
                        for p in coordinates
                    ]
                )
            except ValueError:
                raise ValueError(
                    f"Invalid coordinates found in configuration file. Coordinates must be relative (between 0-1): {coordinates}"
                )

            if explicit:
                self.coordinates = ",".join(
                    [
                        f'{round(int(p.split(",")[0]) / frame_shape[1], 3)},{round(int(p.split(",")[1]) / frame_shape[0], 3)}'
                        for p in coordinates
                    ]
                )
        elif isinstance(coordinates, str):
            points = coordinates.split(",")
            explicit = any(p > "1.0" for p in points)
            try:
                self._contour = np.array(
                    [
                        (
                            [int(points[i]), int(points[i + 1])]
                            if explicit
                            else [
                                int(float(points[i]) * frame_shape[1]),
                                int(float(points[i + 1]) * frame_shape[0]),
                            ]
                        )
                        for i in range(0, len(points), 2)
                    ]
                )
            except ValueError:
                raise ValueError(
                    f"Invalid coordinates found in configuration file. Coordinates must be relative (between 0-1): {coordinates}"
                )

            if explicit:
                self.coordinates = ",".join(
                    [
                        f"{round(int(points[i]) / frame_shape[1], 3)},{round(int(points[i + 1]) / frame_shape[0], 3)}"
                        for i in range(0, len(points), 2)
                    ]
                )
        else:
            self._contour = np.array([])


class ObjectConfig(FrigateBaseModel):
    track: List[str] = Field(default=DEFAULT_TRACKED_OBJECTS, title="Objects to track.")
    filters: Dict[str, FilterConfig] = Field(default={}, title="Object filters.")
    mask: Union[str, List[str]] = Field(default="", title="Object mask.")


class AlertsConfig(FrigateBaseModel):
    """Configure alerts"""

    labels: List[str] = Field(
        default=DEFAULT_ALERT_OBJECTS, title="Labels to create alerts for."
    )
    required_zones: Union[str, List[str]] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to save the event as an alert.",
    )

    @field_validator("required_zones", mode="before")
    @classmethod
    def validate_required_zones(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v


class DetectionsConfig(FrigateBaseModel):
    """Configure detections"""

    labels: Optional[List[str]] = Field(
        default=None, title="Labels to create detections for."
    )
    required_zones: Union[str, List[str]] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to save the event as a detection.",
    )

    @field_validator("required_zones", mode="before")
    @classmethod
    def validate_required_zones(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v


class ReviewConfig(FrigateBaseModel):
    """Configure reviews"""

    alerts: AlertsConfig = Field(
        default_factory=AlertsConfig, title="Review alerts config."
    )
    detections: DetectionsConfig = Field(
        default_factory=DetectionsConfig, title="Review detections config."
    )


class SemanticSearchConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable semantic search.")
    reindex: Optional[bool] = Field(
        default=False, title="Reindex all detections on startup."
    )


class GenAIProviderEnum(str, Enum):
    openai = "openai"
    gemini = "gemini"
    ollama = "ollama"


class GenAIConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable GenAI.")
    provider: GenAIProviderEnum = Field(
        default=GenAIProviderEnum.openai, title="GenAI provider."
    )
    base_url: Optional[str] = Field(None, title="Provider base url.")
    api_key: Optional[EnvString] = Field(None, title="Provider API key.")
    model: str = Field(default="gpt-4o", title="GenAI model.")
    prompt: str = Field(
        default="Describe the {label} in the sequence of images with as much detail as possible. Do not describe the background.",
        title="Default caption prompt.",
    )
    object_prompts: Dict[str, str] = Field(default={}, title="Object specific prompts.")


# uses BaseModel because some global attributes are not available at the camera level
class GenAICameraConfig(BaseModel):
    enabled: bool = Field(default=False, title="Enable GenAI for camera.")
    prompt: str = Field(
        default="Describe the {label} in the sequence of images with as much detail as possible. Do not describe the background.",
        title="Default caption prompt.",
    )
    object_prompts: Dict[str, str] = Field(default={}, title="Object specific prompts.")
    objects: Union[str, List[str]] = Field(
        default_factory=list,
        title="List of objects to run generative AI for.",
    )
    required_zones: Union[str, List[str]] = Field(
        default_factory=list,
        title="List of required zones to be entered in order to run generative AI.",
    )

    @field_validator("required_zones", mode="before")
    @classmethod
    def validate_required_zones(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v


class AudioConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable audio events.")
    max_not_heard: int = Field(
        default=30, title="Seconds of not hearing the type of audio to end the event."
    )
    min_volume: int = Field(
        default=500, title="Min volume required to run audio detection."
    )
    listen: List[str] = Field(
        default=DEFAULT_LISTEN_AUDIO, title="Audio to listen for."
    )
    filters: Optional[Dict[str, AudioFilterConfig]] = Field(
        None, title="Audio filters."
    )
    enabled_in_config: Optional[bool] = Field(
        None, title="Keep track of original state of audio detection."
    )
    num_threads: int = Field(default=2, title="Number of detection threads", ge=1)


class BirdseyeModeEnum(str, Enum):
    objects = "objects"
    motion = "motion"
    continuous = "continuous"

    @classmethod
    def get_index(cls, type):
        return list(cls).index(type)

    @classmethod
    def get(cls, index):
        return list(cls)[index]


class BirdseyeLayoutConfig(FrigateBaseModel):
    scaling_factor: float = Field(
        default=2.0, title="Birdseye Scaling Factor", ge=1.0, le=5.0
    )
    max_cameras: Optional[int] = Field(default=None, title="Max cameras")


class BirdseyeConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="Enable birdseye view.")
    restream: bool = Field(default=False, title="Restream birdseye via RTSP.")
    width: int = Field(default=1280, title="Birdseye width.")
    height: int = Field(default=720, title="Birdseye height.")
    quality: int = Field(
        default=8,
        title="Encoding quality.",
        ge=1,
        le=31,
    )
    inactivity_threshold: int = Field(
        default=30, title="Birdseye Inactivity Threshold", gt=0
    )
    mode: BirdseyeModeEnum = Field(
        default=BirdseyeModeEnum.objects, title="Tracking mode."
    )
    layout: BirdseyeLayoutConfig = Field(
        default_factory=BirdseyeLayoutConfig, title="Birdseye Layout Config"
    )


# uses BaseModel because some global attributes are not available at the camera level
class BirdseyeCameraConfig(BaseModel):
    enabled: bool = Field(default=True, title="Enable birdseye view for camera.")
    order: int = Field(default=0, title="Position of the camera in the birdseye view.")
    mode: BirdseyeModeEnum = Field(
        default=BirdseyeModeEnum.objects, title="Tracking mode for camera."
    )


# Note: Setting threads to less than 2 caused several issues with recording segments
# https://github.com/blakeblackshear/frigate/issues/5659
FFMPEG_GLOBAL_ARGS_DEFAULT = ["-hide_banner", "-loglevel", "warning", "-threads", "2"]
FFMPEG_INPUT_ARGS_DEFAULT = "preset-rtsp-generic"
DETECT_FFMPEG_OUTPUT_ARGS_DEFAULT = [
    "-threads",
    "2",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "yuv420p",
]
RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT = "preset-record-generic"


class FfmpegOutputArgsConfig(FrigateBaseModel):
    detect: Union[str, List[str]] = Field(
        default=DETECT_FFMPEG_OUTPUT_ARGS_DEFAULT,
        title="Detect role FFmpeg output arguments.",
    )
    record: Union[str, List[str]] = Field(
        default=RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT,
        title="Record role FFmpeg output arguments.",
    )
    _force_record_hvc1: bool = PrivateAttr(default=False)


class FfmpegConfig(FrigateBaseModel):
    path: str = Field(default="default", title="FFmpeg path")
    global_args: Union[str, List[str]] = Field(
        default=FFMPEG_GLOBAL_ARGS_DEFAULT, title="Global FFmpeg arguments."
    )
    hwaccel_args: Union[str, List[str]] = Field(
        default="auto", title="FFmpeg hardware acceleration arguments."
    )
    input_args: Union[str, List[str]] = Field(
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

    @field_validator("inputs")
    @classmethod
    def validate_roles(cls, v):
        roles = [role for i in v for role in i.roles]
        roles_set = set(roles)

        if len(roles) > len(roles_set):
            raise ValueError("Each input role may only be used once.")

        if "detect" not in roles:
            raise ValueError("The detect role is required.")

        return v


class RetainConfig(FrigateBaseModel):
    default: float = Field(default=10, title="Default retention period.")
    mode: RetainModeEnum = Field(default=RetainModeEnum.motion, title="Retain mode.")
    objects: Dict[str, float] = Field(
        default_factory=dict, title="Object retention period."
    )


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
    height: Optional[int] = Field(None, title="Snapshot image height.")
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
    effect: Optional[TimestampEffectEnum] = Field(None, title="Timestamp effect.")


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


class CameraLiveConfig(FrigateBaseModel):
    stream_name: str = Field(default="", title="Name of restream to use as live view.")
    height: int = Field(default=720, title="Live camera view height")
    quality: int = Field(default=8, ge=1, le=31, title="Live camera view quality")


class RestreamConfig(BaseModel):
    model_config = ConfigDict(extra="allow")


class CameraUiConfig(FrigateBaseModel):
    order: int = Field(default=0, title="Order of camera in UI.")
    dashboard: bool = Field(
        default=True, title="Show this camera in Frigate dashboard UI."
    )


class CameraConfig(FrigateBaseModel):
    name: Optional[str] = Field(None, title="Camera name.", pattern=REGEX_CAMERA_NAME)
    enabled: bool = Field(default=True, title="Enable camera.")
    ffmpeg: CameraFfmpegConfig = Field(title="FFmpeg configuration for the camera.")
    best_image_timeout: int = Field(
        default=60,
        title="How long to wait for the image with the highest confidence score.",
    )
    webui_url: Optional[str] = Field(
        None,
        title="URL to visit the camera directly from system page",
    )
    zones: Dict[str, ZoneConfig] = Field(
        default_factory=dict, title="Zone configuration."
    )
    record: RecordConfig = Field(
        default_factory=RecordConfig, title="Record configuration."
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
    review: ReviewConfig = Field(
        default_factory=ReviewConfig, title="Review configuration."
    )
    genai: GenAICameraConfig = Field(
        default_factory=GenAICameraConfig, title="Generative AI configuration."
    )
    audio: AudioConfig = Field(
        default_factory=AudioConfig, title="Audio events configuration."
    )
    motion: Optional[MotionConfig] = Field(
        None, title="Motion detection configuration."
    )
    detect: DetectConfig = Field(
        default_factory=DetectConfig, title="Object detection configuration."
    )
    onvif: OnvifConfig = Field(
        default_factory=OnvifConfig, title="Camera Onvif Configuration."
    )
    ui: CameraUiConfig = Field(
        default_factory=CameraUiConfig, title="Camera UI Modifications."
    )
    birdseye: BirdseyeCameraConfig = Field(
        default_factory=BirdseyeCameraConfig, title="Birdseye camera configuration."
    )
    timestamp_style: TimestampStyleConfig = Field(
        default_factory=TimestampStyleConfig, title="Timestamp style configuration."
    )
    _ffmpeg_cmds: List[Dict[str, List[str]]] = PrivateAttr()

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


class DatabaseConfig(FrigateBaseModel):
    path: str = Field(default=DEFAULT_DB_PATH, title="Database path.")


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

    def install(self):
        """Install global logging state."""
        logging.getLogger().setLevel(self.default.value.upper())

        log_levels = {
            "werkzeug": LogLevelEnum.error,
            "ws4py": LogLevelEnum.error,
            **self.logs,
        }

        for log, level in log_levels.items():
            logging.getLogger(log).setLevel(level.value.upper())


class CameraGroupConfig(FrigateBaseModel):
    """Represents a group of cameras."""

    cameras: Union[str, List[str]] = Field(
        default_factory=list, title="List of cameras in this group."
    )
    icon: str = Field(default="generic", title="Icon that represents camera group.")
    order: int = Field(default=0, title="Sort order for group.")

    @field_validator("cameras", mode="before")
    @classmethod
    def validate_cameras(cls, v):
        if isinstance(v, str) and "," not in v:
            return [v]

        return v


def verify_config_roles(camera_config: CameraConfig) -> None:
    """Verify that roles are setup in the config correctly."""
    assigned_roles = list(
        set([r for i in camera_config.ffmpeg.inputs for r in i.roles])
    )

    if camera_config.record.enabled and "record" not in assigned_roles:
        raise ValueError(
            f"Camera {camera_config.name} has record enabled, but record is not assigned to an input."
        )

    if camera_config.audio.enabled and "audio" not in assigned_roles:
        raise ValueError(
            f"Camera {camera_config.name} has audio events enabled, but audio is not assigned to an input."
        )


def verify_valid_live_stream_name(
    frigate_config: FrigateConfig, camera_config: CameraConfig
) -> ValueError | None:
    """Verify that a restream exists to use for live view."""
    if (
        camera_config.live.stream_name
        not in frigate_config.go2rtc.model_dump().get("streams", {}).keys()
    ):
        return ValueError(
            f"No restream with name {camera_config.live.stream_name} exists for camera {camera_config.name}."
        )


def verify_recording_retention(camera_config: CameraConfig) -> None:
    """Verify that recording retention modes are ranked correctly."""
    rank_map = {
        RetainModeEnum.all: 0,
        RetainModeEnum.motion: 1,
        RetainModeEnum.active_objects: 2,
    }

    if (
        camera_config.record.retain.days != 0
        and rank_map[camera_config.record.retain.mode]
        > rank_map[camera_config.record.alerts.retain.mode]
    ):
        logger.warning(
            f"{camera_config.name}: Recording retention is configured for {camera_config.record.retain.mode} and alert retention is configured for {camera_config.record.alerts.retain.mode}. The more restrictive retention policy will be applied."
        )

    if (
        camera_config.record.retain.days != 0
        and rank_map[camera_config.record.retain.mode]
        > rank_map[camera_config.record.detections.retain.mode]
    ):
        logger.warning(
            f"{camera_config.name}: Recording retention is configured for {camera_config.record.retain.mode} and detection retention is configured for {camera_config.record.detections.retain.mode}. The more restrictive retention policy will be applied."
        )


def verify_recording_segments_setup_with_reasonable_time(
    camera_config: CameraConfig,
) -> None:
    """Verify that recording segments are setup and segment time is not greater than 60."""
    record_args: list[str] = get_ffmpeg_arg_list(
        camera_config.ffmpeg.output_args.record
    )

    if record_args[0].startswith("preset"):
        return

    try:
        seg_arg_index = record_args.index("-segment_time")
    except ValueError:
        raise ValueError(f"Camera {camera_config.name} has no segment_time in \
                         recording output args, segment args are required for record.")

    if int(record_args[seg_arg_index + 1]) > 60:
        raise ValueError(f"Camera {camera_config.name} has invalid segment_time output arg, \
                         segment_time must be 60 or less.")


def verify_zone_objects_are_tracked(camera_config: CameraConfig) -> None:
    """Verify that user has not entered zone objects that are not in the tracking config."""
    for zone_name, zone in camera_config.zones.items():
        for obj in zone.objects:
            if obj not in camera_config.objects.track:
                raise ValueError(
                    f"Zone {zone_name} is configured to track {obj} but that object type is not added to objects -> track."
                )


def verify_required_zones_exist(camera_config: CameraConfig) -> None:
    for det_zone in camera_config.review.detections.required_zones:
        if det_zone not in camera_config.zones.keys():
            raise ValueError(
                f"Camera {camera_config.name} has a required zone for detections {det_zone} that is not defined."
            )

    for det_zone in camera_config.review.alerts.required_zones:
        if det_zone not in camera_config.zones.keys():
            raise ValueError(
                f"Camera {camera_config.name} has a required zone for alerts {det_zone} that is not defined."
            )


def verify_autotrack_zones(camera_config: CameraConfig) -> ValueError | None:
    """Verify that required_zones are specified when autotracking is enabled."""
    if (
        camera_config.onvif.autotracking.enabled
        and not camera_config.onvif.autotracking.required_zones
    ):
        raise ValueError(
            f"Camera {camera_config.name} has autotracking enabled, required_zones must be set to at least one of the camera's zones."
        )


def verify_motion_and_detect(camera_config: CameraConfig) -> ValueError | None:
    """Verify that required_zones are specified when autotracking is enabled."""
    if camera_config.detect.enabled and not camera_config.motion.enabled:
        raise ValueError(
            f"Camera {camera_config.name} has motion detection disabled and object detection enabled but object detection requires motion detection."
        )


class FrigateConfig(FrigateBaseModel):
    mqtt: MqttConfig = Field(title="MQTT configuration.")
    database: DatabaseConfig = Field(
        default_factory=DatabaseConfig, title="Database configuration."
    )
    tls: TlsConfig = Field(default_factory=TlsConfig, title="TLS configuration.")
    proxy: ProxyConfig = Field(
        default_factory=ProxyConfig, title="Proxy configuration."
    )
    auth: AuthConfig = Field(default_factory=AuthConfig, title="Auth configuration.")
    environment_vars: Dict[str, str] = Field(
        default_factory=dict, title="Frigate environment variables."
    )
    ui: UIConfig = Field(default_factory=UIConfig, title="UI configuration.")
    notifications: NotificationConfig = Field(
        default_factory=NotificationConfig, title="Notification Config"
    )
    telemetry: TelemetryConfig = Field(
        default_factory=TelemetryConfig, title="Telemetry configuration."
    )
    model: ModelConfig = Field(
        default_factory=ModelConfig, title="Detection model configuration."
    )
    detectors: Dict[str, BaseDetectorConfig] = Field(
        default=DEFAULT_DETECTORS,
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
        default_factory=CameraLiveConfig, title="Live playback settings."
    )
    go2rtc: RestreamConfig = Field(
        default_factory=RestreamConfig, title="Global restream configuration."
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
    review: ReviewConfig = Field(
        default_factory=ReviewConfig, title="Review configuration."
    )
    semantic_search: SemanticSearchConfig = Field(
        default_factory=SemanticSearchConfig, title="Semantic search configuration."
    )
    genai: GenAIConfig = Field(
        default_factory=GenAIConfig, title="Generative AI configuration."
    )
    audio: AudioConfig = Field(
        default_factory=AudioConfig, title="Global Audio events configuration."
    )
    motion: Optional[MotionConfig] = Field(
        None, title="Global motion detection configuration."
    )
    detect: DetectConfig = Field(
        default_factory=DetectConfig, title="Global object tracking configuration."
    )
    cameras: Dict[str, CameraConfig] = Field(title="Camera configuration.")
    camera_groups: Dict[str, CameraGroupConfig] = Field(
        default_factory=dict, title="Camera group configuration"
    )
    timestamp_style: TimestampStyleConfig = Field(
        default_factory=TimestampStyleConfig,
        title="Global timestamp style configuration.",
    )
    version: Optional[str] = Field(default=None, title="Current config version.")

    _plus_api: PlusApi

    @property
    def plus_api(self) -> PlusApi:
        return self._plus_api

    @model_validator(mode="after")
    def post_validation(self, info: ValidationInfo) -> Self:
        # Load plus api from context, if possible.
        self._plus_api = None
        if isinstance(info.context, dict):
            self._plus_api = info.context.get("plus_api")

        # Ensure self._plus_api is set, if no explicit value is provided.
        if self._plus_api is None:
            self._plus_api = PlusApi()

        # set notifications state
        self.notifications.enabled_in_config = self.notifications.enabled

        # set default min_score for object attributes
        for attribute in self.model.all_attributes:
            if not self.objects.filters.get(attribute):
                self.objects.filters[attribute] = FilterConfig(min_score=0.7)
            elif self.objects.filters[attribute].min_score == 0.5:
                self.objects.filters[attribute].min_score = 0.7

        # auto detect hwaccel args
        if self.ffmpeg.hwaccel_args == "auto":
            self.ffmpeg.hwaccel_args = auto_detect_hwaccel()

        # Global config to propagate down to camera level
        global_config = self.model_dump(
            include={
                "audio": ...,
                "birdseye": ...,
                "record": ...,
                "snapshots": ...,
                "live": ...,
                "objects": ...,
                "review": ...,
                "genai": ...,
                "motion": ...,
                "detect": ...,
                "ffmpeg": ...,
                "timestamp_style": ...,
            },
            exclude_unset=True,
        )

        for name, camera in self.cameras.items():
            merged_config = deep_merge(
                camera.model_dump(exclude_unset=True), global_config
            )
            camera_config: CameraConfig = CameraConfig.model_validate(
                {"name": name, **merged_config}
            )

            if camera_config.ffmpeg.hwaccel_args == "auto":
                camera_config.ffmpeg.hwaccel_args = self.ffmpeg.hwaccel_args

            for input in camera_config.ffmpeg.inputs:
                need_record_fourcc = False and "record" in input.roles
                need_detect_dimensions = "detect" in input.roles and (
                    camera_config.detect.height is None
                    or camera_config.detect.width is None
                )

                if need_detect_dimensions or need_record_fourcc:
                    stream_info = {"width": 0, "height": 0, "fourcc": None}
                    try:
                        stream_info = stream_info_retriever.get_stream_info(
                            self.ffmpeg, input.path
                        )
                    except Exception:
                        logger.warn(
                            f"Error detecting stream parameters automatically for {input.path} Applying default values."
                        )
                        stream_info = {"width": 0, "height": 0, "fourcc": None}

                if need_detect_dimensions:
                    camera_config.detect.width = (
                        stream_info["width"]
                        if stream_info.get("width")
                        else DEFAULT_DETECT_DIMENSIONS["width"]
                    )
                    camera_config.detect.height = (
                        stream_info["height"]
                        if stream_info.get("height")
                        else DEFAULT_DETECT_DIMENSIONS["height"]
                    )

                if need_record_fourcc:
                    # Apple only supports HEVC if it is hvc1 (vs. hev1)
                    camera_config.ffmpeg.output_args._force_record_hvc1 = (
                        stream_info["fourcc"] == "hevc"
                        if stream_info.get("hevc")
                        else False
                    )

            # Warn if detect fps > 10
            if camera_config.detect.fps > 10:
                logger.warning(
                    f"{camera_config.name} detect fps is set to {camera_config.detect.fps}. This does NOT need to match your camera's frame rate. High values could lead to reduced performance. Recommended value is 5."
                )

            # Default min_initialized configuration
            min_initialized = int(camera_config.detect.fps / 2)
            if camera_config.detect.min_initialized is None:
                camera_config.detect.min_initialized = min_initialized

            # Default max_disappeared configuration
            max_disappeared = camera_config.detect.fps * 5
            if camera_config.detect.max_disappeared is None:
                camera_config.detect.max_disappeared = max_disappeared

            # Default stationary_threshold configuration
            stationary_threshold = camera_config.detect.fps * 10
            if camera_config.detect.stationary.threshold is None:
                camera_config.detect.stationary.threshold = stationary_threshold
            # default to the stationary_threshold if not defined
            if camera_config.detect.stationary.interval is None:
                camera_config.detect.stationary.interval = stationary_threshold

            # set config pre-value
            camera_config.audio.enabled_in_config = camera_config.audio.enabled
            camera_config.record.enabled_in_config = camera_config.record.enabled
            camera_config.onvif.autotracking.enabled_in_config = (
                camera_config.onvif.autotracking.enabled
            )

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
                        get_relative_coordinates(
                            (
                                camera_config.objects.mask
                                if isinstance(camera_config.objects.mask, list)
                                else [camera_config.objects.mask]
                            ),
                            camera_config.frame_shape,
                        )
                        or []
                    )
                    filter.mask = filter_mask + object_mask

                # Set runtime filter to create masks
                camera_config.objects.filters[object] = RuntimeFilterConfig(
                    frame_shape=camera_config.frame_shape,
                    **filter.model_dump(exclude_unset=True),
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
                    **camera_config.motion.model_dump(exclude_unset=True),
                )
            camera_config.motion.enabled_in_config = camera_config.motion.enabled

            # generate zone contours
            if len(camera_config.zones) > 0:
                for zone in camera_config.zones.values():
                    zone.generate_contour(camera_config.frame_shape)

            # Set live view stream if none is set
            if not camera_config.live.stream_name:
                camera_config.live.stream_name = name

            # generate the ffmpeg commands
            camera_config.create_ffmpeg_cmds()
            self.cameras[name] = camera_config

            verify_config_roles(camera_config)
            verify_valid_live_stream_name(self, camera_config)
            verify_recording_retention(camera_config)
            verify_recording_segments_setup_with_reasonable_time(camera_config)
            verify_zone_objects_are_tracked(camera_config)
            verify_required_zones_exist(camera_config)
            verify_autotrack_zones(camera_config)
            verify_motion_and_detect(camera_config)

        # get list of unique enabled labels for tracking
        enabled_labels = set(self.objects.track)

        for camera in self.cameras.values():
            enabled_labels.update(camera.objects.track)

        self.model.create_colormap(sorted(enabled_labels))
        self.model.check_and_load_plus_model(self.plus_api)

        for key, detector in self.detectors.items():
            adapter = TypeAdapter(DetectorConfig)
            model_dict = (
                detector
                if isinstance(detector, dict)
                else detector.model_dump(warnings="none")
            )
            detector_config: DetectorConfig = adapter.validate_python(model_dict)
            if detector_config.model is None:
                detector_config.model = self.model.model_copy()
            else:
                path = detector_config.model.path
                detector_config.model = self.model.model_copy()
                detector_config.model.path = path

                if "path" not in model_dict or len(model_dict.keys()) > 1:
                    logger.warning(
                        "Customizing more than a detector model path is unsupported."
                    )

            merged_model = deep_merge(
                detector_config.model.model_dump(exclude_unset=True, warnings="none"),
                self.model.model_dump(exclude_unset=True, warnings="none"),
            )

            if "path" not in merged_model:
                if detector_config.type == "cpu":
                    merged_model["path"] = "/cpu_model.tflite"
                elif detector_config.type == "edgetpu":
                    merged_model["path"] = "/edgetpu_model.tflite"

            detector_config.model = ModelConfig.model_validate(merged_model)
            detector_config.model.check_and_load_plus_model(
                self.plus_api, detector_config.type
            )
            detector_config.model.compute_model_hash()
            self.detectors[key] = detector_config

        return self

    @field_validator("cameras")
    @classmethod
    def ensure_zones_and_cameras_have_different_names(cls, v: Dict[str, CameraConfig]):
        zones = [zone for camera in v.values() for zone in camera.zones.keys()]
        for zone in zones:
            if zone in v.keys():
                raise ValueError("Zones cannot share names with cameras")
        return v

    @classmethod
    def load(cls, **kwargs):
        config_path = os.environ.get("CONFIG_FILE")

        # No explicit configuration file, try to find one in the default paths.
        if config_path is None:
            for path in DEFAULT_CONFIG_FILES:
                if os.path.isfile(path):
                    config_path = path
                    break

        # No configuration file found, create one.
        new_config = False
        if config_path is None:
            logger.info("No config file found, saving default config")
            config_path = DEFAULT_CONFIG_FILES[-1]
            new_config = True
        else:
            # Check if the config file needs to be migrated.
            migrate_frigate_config(config_path)

        # Finally, load the resulting configuration file.
        with open(config_path, "a+") as f:
            # Only write the default config if the opened file is non-empty. This can happen as
            # a race condition. It's extremely unlikely, but eh. Might as well check it.
            if new_config and f.tell() == 0:
                f.write(DEFAULT_CONFIG)
                logger.info(
                    "Created default config file, see the getting started docs \
                    for configuration https://docs.frigate.video/guides/getting_started"
                )

            f.seek(0)
            return FrigateConfig.parse(f, **kwargs)

    @classmethod
    def parse(cls, config, *, is_json=None, **context):
        # If config is a file, read its contents.
        if hasattr(config, "read"):
            fname = getattr(config, "name", None)
            config = config.read()

            # Try to guess the value of is_json from the file extension.
            if is_json is None and fname:
                _, ext = os.path.splitext(fname)
                if ext in (".yaml", ".yml"):
                    is_json = False
                elif ext == ".json":
                    is_json = True

        # At this point, try to sniff the config string, to guess if it is json or not.
        if is_json is None:
            is_json = REGEX_JSON.match(config) is not None

        # Parse the config into a dictionary.
        if is_json:
            config = json.load(config)
        else:
            config = yaml.load(config)

        # Validate and return the config dict.
        return cls.parse_object(config, **context)

    @classmethod
    def parse_yaml(cls, config_yaml, **context):
        return cls.parse(config_yaml, is_json=False, **context)

    @classmethod
    def parse_object(cls, obj: Any, *, plus_api: Optional[PlusApi] = None):
        return cls.model_validate(obj, context={"plus_api": plus_api})

    def install(self):
        """Install global state from the config."""
        self.logger.install()

        for key, value in self.environment_vars.items():
            os.environ[key] = value
