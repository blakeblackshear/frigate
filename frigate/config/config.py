from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional, Union

import numpy as np
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    TypeAdapter,
    ValidationInfo,
    field_serializer,
    field_validator,
    model_validator,
)
from ruamel.yaml import YAML
from typing_extensions import Self

from frigate.const import REGEX_JSON
from frigate.detectors import DetectorConfig, ModelConfig
from frigate.detectors.detector_config import BaseDetectorConfig
from frigate.plus import PlusApi
from frigate.util.builtin import (
    deep_merge,
    get_ffmpeg_arg_list,
)
from frigate.util.config import (
    StreamInfoRetriever,
    get_relative_coordinates,
    migrate_frigate_config,
)
from frigate.util.image import create_mask
from frigate.util.services import auto_detect_hwaccel

from .auth import AuthConfig
from .base import FrigateBaseModel
from .camera import CameraConfig, CameraLiveConfig
from .camera.audio import AudioConfig
from .camera.birdseye import BirdseyeConfig
from .camera.detect import DetectConfig
from .camera.ffmpeg import FfmpegConfig
from .camera.genai import GenAIConfig
from .camera.motion import MotionConfig
from .camera.objects import FilterConfig, ObjectConfig
from .camera.record import RecordConfig, RetainModeEnum
from .camera.review import ReviewConfig
from .camera.snapshots import SnapshotsConfig
from .camera.timestamp import TimestampStyleConfig
from .camera_group import CameraGroupConfig
from .database import DatabaseConfig
from .env import EnvVars
from .logger import LoggerConfig
from .mqtt import MqttConfig
from .notification import NotificationConfig
from .proxy import ProxyConfig
from .semantic_search import FaceRecognitionConfig, SemanticSearchConfig
from .telemetry import TelemetryConfig
from .tls import TlsConfig
from .ui import UIConfig

__all__ = ["FrigateConfig"]

logger = logging.getLogger(__name__)

yaml = YAML()

DEFAULT_CONFIG_FILE = "/config/config.yml"
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

DEFAULT_DETECTORS = {"cpu": {"type": "cpu"}}
DEFAULT_DETECT_DIMENSIONS = {"width": 1280, "height": 720}

# stream info handler
stream_info_retriever = StreamInfoRetriever()


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


class RestreamConfig(BaseModel):
    model_config = ConfigDict(extra="allow")


def verify_semantic_search_dependent_configs(config: FrigateConfig) -> None:
    """Verify that semantic search is enabled if required features are enabled."""
    if not config.semantic_search.enabled:
        if config.genai.enabled:
            raise ValueError("Genai requires semantic search to be enabled.")

        if config.face_recognition.enabled:
            raise ValueError("Face recognition requires semantic to be enabled.")


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
    version: Optional[str] = Field(default=None, title="Current config version.")

    # Fields that install global state should be defined first, so that their validators run first.
    environment_vars: EnvVars = Field(
        default_factory=dict, title="Frigate environment variables."
    )
    logger: LoggerConfig = Field(
        default_factory=LoggerConfig,
        title="Logging configuration.",
        validate_default=True,
    )

    # Global config
    auth: AuthConfig = Field(default_factory=AuthConfig, title="Auth configuration.")
    database: DatabaseConfig = Field(
        default_factory=DatabaseConfig, title="Database configuration."
    )
    go2rtc: RestreamConfig = Field(
        default_factory=RestreamConfig, title="Global restream configuration."
    )
    mqtt: MqttConfig = Field(title="MQTT configuration.")
    notifications: NotificationConfig = Field(
        default_factory=NotificationConfig, title="Notification configuration."
    )
    proxy: ProxyConfig = Field(
        default_factory=ProxyConfig, title="Proxy configuration."
    )
    telemetry: TelemetryConfig = Field(
        default_factory=TelemetryConfig, title="Telemetry configuration."
    )
    tls: TlsConfig = Field(default_factory=TlsConfig, title="TLS configuration.")
    semantic_search: SemanticSearchConfig = Field(
        default_factory=SemanticSearchConfig, title="Semantic search configuration."
    )
    face_recognition: FaceRecognitionConfig = Field(
        default_factory=FaceRecognitionConfig, title="Face recognition config."
    )
    ui: UIConfig = Field(default_factory=UIConfig, title="UI configuration.")

    # Detector config
    detectors: Dict[str, BaseDetectorConfig] = Field(
        default=DEFAULT_DETECTORS,
        title="Detector hardware configuration.",
    )
    model: ModelConfig = Field(
        default_factory=ModelConfig, title="Detection model configuration."
    )

    # Camera config
    cameras: Dict[str, CameraConfig] = Field(title="Camera configuration.")
    audio: AudioConfig = Field(
        default_factory=AudioConfig, title="Global Audio events configuration."
    )
    birdseye: BirdseyeConfig = Field(
        default_factory=BirdseyeConfig, title="Birdseye configuration."
    )
    detect: DetectConfig = Field(
        default_factory=DetectConfig, title="Global object tracking configuration."
    )
    ffmpeg: FfmpegConfig = Field(
        default_factory=FfmpegConfig, title="Global FFmpeg configuration."
    )
    genai: GenAIConfig = Field(
        default_factory=GenAIConfig, title="Generative AI configuration."
    )
    live: CameraLiveConfig = Field(
        default_factory=CameraLiveConfig, title="Live playback settings."
    )
    motion: Optional[MotionConfig] = Field(
        default=None, title="Global motion detection configuration."
    )
    objects: ObjectConfig = Field(
        default_factory=ObjectConfig, title="Global object configuration."
    )
    record: RecordConfig = Field(
        default_factory=RecordConfig, title="Global record configuration."
    )
    review: ReviewConfig = Field(
        default_factory=ReviewConfig, title="Review configuration."
    )
    snapshots: SnapshotsConfig = Field(
        default_factory=SnapshotsConfig, title="Global snapshots configuration."
    )
    timestamp_style: TimestampStyleConfig = Field(
        default_factory=TimestampStyleConfig,
        title="Global timestamp style configuration.",
    )

    camera_groups: Dict[str, CameraGroupConfig] = Field(
        default_factory=dict, title="Camera group configuration"
    )

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
                        logger.warning(
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

        verify_semantic_search_dependent_configs(self)
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
        config_path = os.environ.get("CONFIG_FILE", DEFAULT_CONFIG_FILE)

        if not os.path.isfile(config_path):
            config_path = config_path.replace("yml", "yaml")

        # No configuration file found, create one.
        new_config = False
        if not os.path.isfile(config_path):
            logger.info("No config file found, saving default config")
            config_path = DEFAULT_CONFIG_FILE
            new_config = True
        else:
            # Check if the config file needs to be migrated.
            migrate_frigate_config(config_path)

        # Finally, load the resulting configuration file.
        with open(config_path, "a+" if new_config else "r") as f:
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
    def parse_object(
        cls, obj: Any, *, plus_api: Optional[PlusApi] = None, install: bool = False
    ):
        return cls.model_validate(
            obj, context={"plus_api": plus_api, "install": install}
        )
