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
    CURRENT_CONFIG_VERSION,
    StreamInfoRetriever,
    convert_area_to_pixels,
    find_config_file,
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
from .camera.notification import NotificationConfig
from .camera.objects import FilterConfig, ObjectConfig
from .camera.record import RecordConfig
from .camera.review import ReviewConfig
from .camera.snapshots import SnapshotsConfig
from .camera.timestamp import TimestampStyleConfig
from .camera_group import CameraGroupConfig
from .classification import (
    AudioTranscriptionConfig,
    ClassificationConfig,
    FaceRecognitionConfig,
    LicensePlateRecognitionConfig,
    SemanticSearchConfig,
)
from .database import DatabaseConfig
from .env import EnvVars
from .logger import LoggerConfig
from .mqtt import MqttConfig
from .network import NetworkingConfig
from .proxy import ProxyConfig
from .telemetry import TelemetryConfig
from .tls import TlsConfig
from .ui import UIConfig

__all__ = ["FrigateConfig"]

logger = logging.getLogger(__name__)

yaml = YAML()

DEFAULT_CONFIG = f"""
mqtt:
  enabled: False

cameras: {{}}  # No cameras defined, UI wizard should be used
version: {CURRENT_CONFIG_VERSION}
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

        # Convert min_area and max_area to pixels if they're percentages
        if "min_area" in config:
            config["min_area"] = convert_area_to_pixels(config["min_area"], frame_shape)

        if "max_area" in config:
            config["max_area"] = convert_area_to_pixels(config["max_area"], frame_shape)

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


def verify_valid_live_stream_names(
    frigate_config: FrigateConfig, camera_config: CameraConfig
) -> ValueError | None:
    """Verify that a restream exists to use for live view."""
    for _, stream_name in camera_config.live.streams.items():
        if (
            stream_name
            not in frigate_config.go2rtc.model_dump().get("streams", {}).keys()
        ):
            return ValueError(
                f"No restream with name {stream_name} exists for camera {camera_config.name}."
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
        raise ValueError(
            f"Camera {camera_config.name} has no segment_time in \
                         recording output args, segment args are required for record."
        )

    if int(record_args[seg_arg_index + 1]) > 60:
        raise ValueError(
            f"Camera {camera_config.name} has invalid segment_time output arg, \
                         segment_time must be 60 or less."
        )


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
    """Verify that motion detection is not disabled and object detection is enabled."""
    if camera_config.detect.enabled and not camera_config.motion.enabled:
        raise ValueError(
            f"Camera {camera_config.name} has motion detection disabled and object detection enabled but object detection requires motion detection."
        )


def verify_objects_track(
    camera_config: CameraConfig, enabled_objects: list[str]
) -> None:
    """Verify that a user has not specified an object to track that is not in the labelmap."""
    valid_objects = [
        obj for obj in camera_config.objects.track if obj in enabled_objects
    ]

    if len(valid_objects) != len(camera_config.objects.track):
        invalid_objects = set(camera_config.objects.track) - set(valid_objects)
        logger.warning(
            f"{camera_config.name} is configured to track {list(invalid_objects)} objects, which are not supported by the current model."
        )
        camera_config.objects.track = valid_objects


def verify_lpr_and_face(
    frigate_config: FrigateConfig, camera_config: CameraConfig
) -> ValueError | None:
    """Verify that lpr and face are enabled at the global level if enabled at the camera level."""
    if camera_config.lpr.enabled and not frigate_config.lpr.enabled:
        raise ValueError(
            f"Camera {camera_config.name} has lpr enabled but lpr is disabled at the global level of the config. You must enable lpr at the global level."
        )
    if (
        camera_config.face_recognition.enabled
        and not frigate_config.face_recognition.enabled
    ):
        raise ValueError(
            f"Camera {camera_config.name} has face_recognition enabled but face_recognition is disabled at the global level of the config. You must enable face_recognition at the global level."
        )


class FrigateConfig(FrigateBaseModel):
    version: Optional[str] = Field(default=None, title="Current config version.")
    safe_mode: bool = Field(
        default=False, title="If Frigate should be started in safe mode."
    )

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
        default_factory=NotificationConfig, title="Global notification configuration."
    )
    networking: NetworkingConfig = Field(
        default_factory=NetworkingConfig, title="Networking configuration"
    )
    proxy: ProxyConfig = Field(
        default_factory=ProxyConfig, title="Proxy configuration."
    )
    telemetry: TelemetryConfig = Field(
        default_factory=TelemetryConfig, title="Telemetry configuration."
    )
    tls: TlsConfig = Field(default_factory=TlsConfig, title="TLS configuration.")
    ui: UIConfig = Field(default_factory=UIConfig, title="UI configuration.")

    # Detector config
    detectors: Dict[str, BaseDetectorConfig] = Field(
        default=DEFAULT_DETECTORS,
        title="Detector hardware configuration.",
    )
    model: ModelConfig = Field(
        default_factory=ModelConfig, title="Detection model configuration."
    )

    # GenAI config
    genai: GenAIConfig = Field(
        default_factory=GenAIConfig, title="Generative AI configuration."
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

    # Classification Config
    audio_transcription: AudioTranscriptionConfig = Field(
        default_factory=AudioTranscriptionConfig, title="Audio transcription config."
    )
    classification: ClassificationConfig = Field(
        default_factory=ClassificationConfig, title="Object classification config."
    )
    semantic_search: SemanticSearchConfig = Field(
        default_factory=SemanticSearchConfig, title="Semantic search configuration."
    )
    face_recognition: FaceRecognitionConfig = Field(
        default_factory=FaceRecognitionConfig, title="Face recognition config."
    )
    lpr: LicensePlateRecognitionConfig = Field(
        default_factory=LicensePlateRecognitionConfig,
        title="License Plate recognition config.",
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
                "audio_transcription": ...,
                "birdseye": ...,
                "face_recognition": ...,
                "lpr": ...,
                "record": ...,
                "snapshots": ...,
                "live": ...,
                "objects": ...,
                "review": ...,
                "motion": ...,
                "notifications": ...,
                "detect": ...,
                "ffmpeg": ...,
                "timestamp_style": ...,
            },
            exclude_unset=True,
        )

        for key, detector in self.detectors.items():
            adapter = TypeAdapter(DetectorConfig)
            model_dict = (
                detector
                if isinstance(detector, dict)
                else detector.model_dump(warnings="none")
            )
            detector_config: BaseDetectorConfig = adapter.validate_python(model_dict)

            # users should not set model themselves
            if detector_config.model:
                detector_config.model = None

            model_config = self.model.model_dump(exclude_unset=True, warnings="none")

            if detector_config.model_path:
                model_config["path"] = detector_config.model_path

            if "path" not in model_config:
                if detector_config.type == "cpu" or detector_config.type.endswith(
                    "_tfl"
                ):
                    model_config["path"] = "/cpu_model.tflite"
                elif detector_config.type == "edgetpu":
                    model_config["path"] = "/edgetpu_model.tflite"

            model = ModelConfig.model_validate(model_config)
            model.check_and_load_plus_model(self.plus_api, detector_config.type)
            model.compute_model_hash()
            labelmap_objects = model.merged_labelmap.values()
            detector_config.model = model
            self.detectors[key] = detector_config

        for name, camera in self.cameras.items():
            modified_global_config = global_config.copy()

            # only populate some fields down to the camera level for specific keys
            allowed_fields_map = {
                "face_recognition": ["enabled", "min_area"],
                "lpr": ["enabled", "expire_time", "min_area", "enhancement"],
                "audio_transcription": ["enabled", "live_enabled"],
            }

            for section in allowed_fields_map:
                if section in modified_global_config:
                    modified_global_config[section] = {
                        k: v
                        for k, v in modified_global_config[section].items()
                        if k in allowed_fields_map[section]
                    }

            merged_config = deep_merge(
                camera.model_dump(exclude_unset=True), modified_global_config
            )
            camera_config: CameraConfig = CameraConfig.model_validate(
                {"name": name, **merged_config}
            )

            if camera_config.ffmpeg.hwaccel_args == "auto":
                camera_config.ffmpeg.hwaccel_args = self.ffmpeg.hwaccel_args

            for input in camera_config.ffmpeg.inputs:
                need_detect_dimensions = "detect" in input.roles and (
                    camera_config.detect.height is None
                    or camera_config.detect.width is None
                )

                if need_detect_dimensions:
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

            # Warn if detect fps > 10
            if camera_config.detect.fps > 10 and camera_config.type != "lpr":
                logger.warning(
                    f"{camera_config.name} detect fps is set to {camera_config.detect.fps}. This does NOT need to match your camera's frame rate. High values could lead to reduced performance. Recommended value is 5."
                )
            if camera_config.detect.fps > 15 and camera_config.type == "lpr":
                logger.warning(
                    f"{camera_config.name} detect fps is set to {camera_config.detect.fps}. This does NOT need to match your camera's frame rate. High values could lead to reduced performance. Recommended value for LPR cameras are between 5-15."
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
            camera_config.enabled_in_config = camera_config.enabled
            camera_config.audio.enabled_in_config = camera_config.audio.enabled
            camera_config.audio_transcription.enabled_in_config = (
                camera_config.audio_transcription.enabled
            )
            camera_config.record.enabled_in_config = camera_config.record.enabled
            camera_config.notifications.enabled_in_config = (
                camera_config.notifications.enabled
            )
            camera_config.onvif.autotracking.enabled_in_config = (
                camera_config.onvif.autotracking.enabled
            )
            camera_config.review.alerts.enabled_in_config = (
                camera_config.review.alerts.enabled
            )
            camera_config.review.detections.enabled_in_config = (
                camera_config.review.detections.enabled
            )
            camera_config.objects.genai.enabled_in_config = (
                camera_config.objects.genai.enabled
            )
            camera_config.review.genai.enabled_in_config = (
                camera_config.review.genai.enabled
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
                    if zone.filters:
                        for object_name, filter_config in zone.filters.items():
                            zone.filters[object_name] = RuntimeFilterConfig(
                                frame_shape=camera_config.frame_shape,
                                **filter_config.model_dump(exclude_unset=True),
                            )

                    zone.generate_contour(camera_config.frame_shape)

            # Set live view stream if none is set
            if not camera_config.live.streams:
                camera_config.live.streams = {name: name}

            # generate the ffmpeg commands
            camera_config.create_ffmpeg_cmds()
            self.cameras[name] = camera_config

            verify_config_roles(camera_config)
            verify_valid_live_stream_names(self, camera_config)
            verify_recording_segments_setup_with_reasonable_time(camera_config)
            verify_zone_objects_are_tracked(camera_config)
            verify_required_zones_exist(camera_config)
            verify_autotrack_zones(camera_config)
            verify_motion_and_detect(camera_config)
            verify_objects_track(camera_config, labelmap_objects)
            verify_lpr_and_face(self, camera_config)

        # set names on classification configs
        for name, config in self.classification.custom.items():
            config.name = name

        self.objects.parse_all_objects(self.cameras)
        self.model.create_colormap(sorted(self.objects.all_objects))
        self.model.check_and_load_plus_model(self.plus_api)

        # Check audio transcription and audio detection requirements
        if self.audio_transcription.enabled:
            # If audio transcription is enabled globally, at least one camera must have audio detection enabled
            if not any(camera.audio.enabled for camera in self.cameras.values()):
                raise ValueError(
                    "Audio transcription is enabled globally, but no cameras have audio detection enabled. At least one camera must have audio detection enabled."
                )
        else:
            # If audio transcription is disabled globally, check each camera with audio_transcription enabled
            for camera in self.cameras.values():
                if camera.audio_transcription.enabled and not camera.audio.enabled:
                    raise ValueError(
                        f"Camera {camera.name} has audio transcription enabled, but audio detection is not enabled for this camera. Audio detection must be enabled for cameras with audio transcription when it is disabled globally."
                    )

        if self.plus_api and not self.snapshots.clean_copy:
            logger.warning(
                "Frigate+ is configured but clean snapshots are not enabled, submissions to Frigate+ will not be possible./"
            )

        # Validate auth roles against cameras
        camera_names = set(self.cameras.keys())

        for role, allowed_cameras in self.auth.roles.items():
            invalid_cameras = [
                cam for cam in allowed_cameras if cam not in camera_names
            ]
            if invalid_cameras:
                logger.warning(
                    f"Role '{role}' references non-existent cameras: {invalid_cameras}. "
                )

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
        """Loads the Frigate config file, runs migrations, and creates the config object."""
        config_path = find_config_file()

        # No configuration file found, create one.
        new_config = False
        if not os.path.isfile(config_path):
            logger.info("No config file found, saving default config")
            config_path = config_path
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
                    "Created default config file, see the getting started docs for configuration: https://docs.frigate.video/guides/getting_started"
                )

            f.seek(0)
            return FrigateConfig.parse(f, **kwargs)

    @classmethod
    def parse(cls, config, *, is_json=None, safe_load=False, **context):
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

        # load minimal Frigate config after the full config did not validate
        if safe_load:
            safe_config = {"safe_mode": True, "cameras": {}, "mqtt": {"enabled": False}}

            # copy over auth and proxy config in case auth needs to be enforced
            safe_config["auth"] = config.get("auth", {})
            safe_config["proxy"] = config.get("proxy", {})

            # copy over database config for auth and so a new db is not created
            safe_config["database"] = config.get("database", {})

            return cls.parse_object(safe_config, **context)

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
