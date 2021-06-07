from __future__ import annotations

import base64
import dataclasses
import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import matplotlib.pyplot as plt
import numpy as np
import voluptuous as vol
import yaml

from frigate.const import BASE_DIR, RECORD_DIR, CLIPS_DIR, CACHE_DIR
from frigate.util import create_mask

logger = logging.getLogger(__name__)

DEFAULT_TRACKED_OBJECTS = ["person"]

DEFAULT_DETECTORS = {"coral": {"type": "edgetpu", "device": "usb"}}
DETECTORS_SCHEMA = vol.Schema(
    {
        vol.Required(str): {
            vol.Required("type", default="edgetpu"): vol.In(["cpu", "edgetpu"]),
            vol.Optional("device", default="usb"): str,
            vol.Optional("num_threads", default=3): int,
        }
    }
)


@dataclasses.dataclass(frozen=True)
class DetectorConfig:
    type: str
    device: str
    num_threads: int

    @classmethod
    def build(cls, config) -> DetectorConfig:
        return DetectorConfig(config["type"], config["device"], config["num_threads"])

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


MQTT_SCHEMA = vol.Schema(
    {
        vol.Required("host"): str,
        vol.Optional("port", default=1883): int,
        vol.Optional("topic_prefix", default="frigate"): str,
        vol.Optional("client_id", default="frigate"): str,
        vol.Optional("stats_interval", default=60): int,
        vol.Inclusive("user", "auth"): str,
        vol.Inclusive("password", "auth"): str,
        vol.Optional("tls_ca_certs"): str,
        vol.Optional("tls_client_cert"): str,
        vol.Optional("tls_client_key"): str,
        vol.Optional("tls_insecure"): bool,
    }
)


@dataclasses.dataclass(frozen=True)
class MqttConfig:
    host: str
    port: int
    topic_prefix: str
    client_id: str
    stats_interval: int
    user: Optional[str]
    password: Optional[str]
    tls_ca_certs: Optional[str]
    tls_client_cert: Optional[str]
    tls_client_key: Optional[str]
    tls_insecure: Optional[bool]

    @classmethod
    def build(cls, config) -> MqttConfig:
        return MqttConfig(
            config["host"],
            config["port"],
            config["topic_prefix"],
            config["client_id"],
            config["stats_interval"],
            config.get("user"),
            config.get("password"),
            config.get("tls_ca_certs"),
            config.get("tls_client_cert"),
            config.get("tls_client_key"),
            config.get("tls_insecure"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


RETAIN_SCHEMA = vol.Schema(
    {vol.Required("default", default=10): int, "objects": {str: int}}
)


@dataclasses.dataclass(frozen=True)
class RetainConfig:
    default: int
    objects: Dict[str, int]

    @classmethod
    def build(cls, config, global_config={}) -> RetainConfig:
        return RetainConfig(
            config.get("default", global_config.get("default")),
            config.get("objects", global_config.get("objects", {})),
        )

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


CLIPS_SCHEMA = vol.Schema(
    {
        vol.Optional("max_seconds", default=300): int,
        vol.Optional("retain", default={}): RETAIN_SCHEMA,
    }
)


@dataclasses.dataclass(frozen=True)
class ClipsConfig:
    max_seconds: int
    retain: RetainConfig

    @classmethod
    def build(cls, config) -> ClipsConfig:
        return ClipsConfig(
            config["max_seconds"],
            RetainConfig.build(config["retain"]),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "max_seconds": self.max_seconds,
            "retain": self.retain.to_dict(),
        }


MOTION_SCHEMA = vol.Schema(
    {
        "mask": vol.Any(str, [str]),
        "threshold": vol.Range(min=1, max=255),
        "contour_area": int,
        "delta_alpha": float,
        "frame_alpha": float,
        "frame_height": int,
    }
)


@dataclasses.dataclass(frozen=True)
class MotionConfig:
    raw_mask: Union[str, List[str]]
    mask: np.ndarray
    threshold: int
    contour_area: int
    delta_alpha: float
    frame_alpha: float
    frame_height: int

    @classmethod
    def build(cls, config, global_config, frame_shape) -> MotionConfig:
        raw_mask = config.get("mask")
        if raw_mask:
            mask = create_mask(frame_shape, raw_mask)
        else:
            mask = np.zeros(frame_shape, np.uint8)
            mask[:] = 255

        return MotionConfig(
            raw_mask,
            mask,
            config.get("threshold", global_config.get("threshold", 25)),
            config.get("contour_area", global_config.get("contour_area", 100)),
            config.get("delta_alpha", global_config.get("delta_alpha", 0.2)),
            config.get("frame_alpha", global_config.get("frame_alpha", 0.2)),
            config.get(
                "frame_height", global_config.get("frame_height", frame_shape[0] // 6)
            ),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mask": self.raw_mask,
            "threshold": self.threshold,
            "contour_area": self.contour_area,
            "delta_alpha": self.delta_alpha,
            "frame_alpha": self.frame_alpha,
            "frame_height": self.frame_height,
        }


GLOBAL_DETECT_SCHEMA = vol.Schema({"max_disappeared": int})
DETECT_SCHEMA = GLOBAL_DETECT_SCHEMA.extend(
    {vol.Optional("enabled", default=True): bool}
)


@dataclasses.dataclass
class DetectConfig:
    enabled: bool
    max_disappeared: int

    @classmethod
    def build(cls, config, global_config, camera_fps) -> DetectConfig:
        return DetectConfig(
            config["enabled"],
            config.get(
                "max_disappeared", global_config.get("max_disappeared", camera_fps * 5)
            ),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "max_disappeared": self.max_disappeared,
        }


ZONE_FILTER_SCHEMA = vol.Schema(
    {
        str: {
            "min_area": int,
            "max_area": int,
            "threshold": float,
        }
    }
)
FILTER_SCHEMA = ZONE_FILTER_SCHEMA.extend(
    {
        str: {
            "min_score": float,
            "mask": vol.Any(str, [str]),
        }
    }
)


@dataclasses.dataclass(frozen=True)
class FilterConfig:
    min_area: int
    max_area: int
    threshold: float
    min_score: float
    mask: Optional[np.ndarray]
    raw_mask: Union[str, List[str]]

    @classmethod
    def build(
        cls, config, global_config={}, global_mask=None, frame_shape=None
    ) -> FilterConfig:
        raw_mask = []
        if global_mask:
            if isinstance(global_mask, list):
                raw_mask += global_mask
            elif isinstance(global_mask, str):
                raw_mask += [global_mask]

        config_mask = config.get("mask")
        if config_mask:
            if isinstance(config_mask, list):
                raw_mask += config_mask
            elif isinstance(config_mask, str):
                raw_mask += [config_mask]

        mask = create_mask(frame_shape, raw_mask) if raw_mask else None

        return FilterConfig(
            min_area=config.get("min_area", global_config.get("min_area", 0)),
            max_area=config.get("max_area", global_config.get("max_area", 24000000)),
            threshold=config.get("threshold", global_config.get("threshold", 0.7)),
            min_score=config.get("min_score", global_config.get("min_score", 0.5)),
            mask=mask,
            raw_mask=raw_mask,
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "min_area": self.min_area,
            "max_area": self.max_area,
            "threshold": self.threshold,
            "min_score": self.min_score,
            "mask": self.raw_mask,
        }


ZONE_SCHEMA = {
    str: {
        vol.Required("coordinates"): vol.Any(str, [str]),
        vol.Optional("filters", default={}): ZONE_FILTER_SCHEMA,
    }
}


@dataclasses.dataclass(frozen=True)
class ZoneConfig:
    filters: Dict[str, FilterConfig]
    coordinates: Union[str, List[str]]
    contour: np.ndarray
    color: Tuple[int, int, int]

    @classmethod
    def build(cls, config, color: Tuple[int, int, int]) -> ZoneConfig:
        coordinates = config["coordinates"]

        if isinstance(coordinates, list):
            contour = np.array(
                [[int(p.split(",")[0]), int(p.split(",")[1])] for p in coordinates]
            )
        elif isinstance(coordinates, str):
            points = coordinates.split(",")
            contour = np.array(
                [[int(points[i]), int(points[i + 1])] for i in range(0, len(points), 2)]
            )
        else:
            print(f"Unable to parse zone coordinates for {name}")
            contour = np.array([])

        return ZoneConfig(
            {name: FilterConfig.build(c) for name, c in config["filters"].items()},
            coordinates,
            contour,
            color=color,
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "filters": {k: f.to_dict() for k, f in self.filters.items()},
            "coordinates": self.coordinates,
        }


def filters_for_all_tracked_objects(object_config):
    for tracked_object in object_config.get("track", DEFAULT_TRACKED_OBJECTS):
        if not "filters" in object_config:
            object_config["filters"] = {}
        if not tracked_object in object_config["filters"]:
            object_config["filters"][tracked_object] = {}
    return object_config


OBJECTS_SCHEMA = vol.Schema(
    vol.All(
        filters_for_all_tracked_objects,
        {
            "track": [str],
            "mask": vol.Any(str, [str]),
            vol.Optional("filters", default={}): FILTER_SCHEMA,
        },
    )
)


@dataclasses.dataclass(frozen=True)
class ObjectConfig:
    track: List[str]
    filters: Dict[str, FilterConfig]
    raw_mask: Optional[Union[str, List[str]]]

    @classmethod
    def build(cls, config, global_config, frame_shape) -> ObjectConfig:
        track = config.get("track", global_config.get("track", DEFAULT_TRACKED_OBJECTS))
        raw_mask = config.get("mask")
        return ObjectConfig(
            track,
            {
                name: FilterConfig.build(
                    config["filters"].get(name, {}),
                    global_config["filters"].get(name, {}),
                    raw_mask,
                    frame_shape,
                )
                for name in track
            },
            raw_mask,
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "track": self.track,
            "mask": self.raw_mask,
            "filters": {k: f.to_dict() for k, f in self.filters.items()},
        }


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
SAVE_CLIPS_FFMPEG_OUTPUT_ARGS_DEFAULT = [
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
RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT = [
    "-f",
    "segment",
    "-segment_time",
    "60",
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

GLOBAL_FFMPEG_SCHEMA = vol.Schema(
    {
        vol.Optional("global_args", default=FFMPEG_GLOBAL_ARGS_DEFAULT): vol.Any(
            str, [str]
        ),
        vol.Optional("hwaccel_args", default=[]): vol.Any(str, [str]),
        vol.Optional("input_args", default=FFMPEG_INPUT_ARGS_DEFAULT): vol.Any(
            str, [str]
        ),
        vol.Optional("output_args", default={}): {
            vol.Optional("detect", default=DETECT_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(
                str, [str]
            ),
            vol.Optional("record", default=RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(
                str, [str]
            ),
            vol.Optional(
                "clips", default=SAVE_CLIPS_FFMPEG_OUTPUT_ARGS_DEFAULT
            ): vol.Any(str, [str]),
            vol.Optional("rtmp", default=RTMP_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(
                str, [str]
            ),
        },
    }
)


def each_role_used_once(inputs):
    roles = [role for i in inputs for role in i["roles"]]
    roles_set = set(roles)
    if len(roles) > len(roles_set):
        raise ValueError
    return inputs


def detect_is_required(inputs):
    roles = [role for i in inputs for role in i["roles"]]
    if not "detect" in roles:
        raise ValueError
    return inputs


CAMERA_FFMPEG_SCHEMA = vol.Schema(
    {
        vol.Required("inputs"): vol.All(
            [
                {
                    vol.Required("path"): str,
                    vol.Required("roles"): ["detect", "clips", "record", "rtmp"],
                    "global_args": vol.Any(str, [str]),
                    "hwaccel_args": vol.Any(str, [str]),
                    "input_args": vol.Any(str, [str]),
                }
            ],
            vol.Msg(each_role_used_once, msg="Each input role may only be used once"),
            vol.Msg(detect_is_required, msg="The detect role is required"),
        ),
        "global_args": vol.Any(str, [str]),
        "hwaccel_args": vol.Any(str, [str]),
        "input_args": vol.Any(str, [str]),
        "output_args": {
            vol.Optional("detect", default=DETECT_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(
                str, [str]
            ),
            vol.Optional("record", default=RECORD_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(
                str, [str]
            ),
            vol.Optional(
                "clips", default=SAVE_CLIPS_FFMPEG_OUTPUT_ARGS_DEFAULT
            ): vol.Any(str, [str]),
            vol.Optional("rtmp", default=RTMP_FFMPEG_OUTPUT_ARGS_DEFAULT): vol.Any(
                str, [str]
            ),
        },
    }
)


@dataclasses.dataclass(frozen=True)
class CameraFfmpegConfig:
    inputs: List[CameraInput]
    output_args: Dict[str, List[str]]

    @classmethod
    def build(self, config, global_config):
        output_args = config.get("output_args", global_config["output_args"])
        output_args = {
            k: v if isinstance(v, list) else v.split(" ")
            for k, v in output_args.items()
        }
        return CameraFfmpegConfig(
            [CameraInput.build(i, config, global_config) for i in config["inputs"]],
            output_args,
        )


@dataclasses.dataclass(frozen=True)
class CameraInput:
    path: str
    roles: List[str]
    global_args: List[str]
    hwaccel_args: List[str]
    input_args: List[str]

    @classmethod
    def build(cls, ffmpeg_input, camera_config, global_config) -> CameraInput:
        return CameraInput(
            ffmpeg_input["path"],
            ffmpeg_input["roles"],
            CameraInput._extract_args(
                "global_args", ffmpeg_input, camera_config, global_config
            ),
            CameraInput._extract_args(
                "hwaccel_args", ffmpeg_input, camera_config, global_config
            ),
            CameraInput._extract_args(
                "input_args", ffmpeg_input, camera_config, global_config
            ),
        )

    @staticmethod
    def _extract_args(name, ffmpeg_input, camera_config, global_config):
        args = ffmpeg_input.get(name, camera_config.get(name, global_config[name]))
        return args if isinstance(args, list) else args.split(" ")


def ensure_zones_and_cameras_have_different_names(cameras):
    zones = [zone for camera in cameras.values() for zone in camera["zones"].keys()]
    for zone in zones:
        if zone in cameras.keys():
            raise ValueError
    return cameras


CAMERAS_SCHEMA = vol.Schema(
    vol.All(
        {
            str: {
                vol.Required("ffmpeg"): CAMERA_FFMPEG_SCHEMA,
                vol.Required("height"): int,
                vol.Required("width"): int,
                "fps": int,
                vol.Optional("best_image_timeout", default=60): int,
                vol.Optional("zones", default={}): ZONE_SCHEMA,
                vol.Optional("clips", default={}): {
                    vol.Optional("enabled", default=False): bool,
                    vol.Optional("pre_capture", default=5): int,
                    vol.Optional("post_capture", default=5): int,
                    vol.Optional("required_zones", default=[]): [str],
                    "objects": [str],
                    vol.Optional("retain", default={}): RETAIN_SCHEMA,
                },
                vol.Optional("record", default={}): {
                    "enabled": bool,
                    "retain_days": int,
                },
                vol.Optional("rtmp", default={}): {
                    vol.Required("enabled", default=True): bool,
                },
                vol.Optional("snapshots", default={}): {
                    vol.Optional("enabled", default=False): bool,
                    vol.Optional("timestamp", default=False): bool,
                    vol.Optional("bounding_box", default=False): bool,
                    vol.Optional("crop", default=False): bool,
                    vol.Optional("required_zones", default=[]): [str],
                    "height": int,
                    vol.Optional("retain", default={}): RETAIN_SCHEMA,
                },
                vol.Optional("mqtt", default={}): {
                    vol.Optional("enabled", default=True): bool,
                    vol.Optional("timestamp", default=True): bool,
                    vol.Optional("bounding_box", default=True): bool,
                    vol.Optional("crop", default=True): bool,
                    vol.Optional("height", default=270): int,
                    vol.Optional("required_zones", default=[]): [str],
                },
                vol.Optional("objects", default={}): OBJECTS_SCHEMA,
                vol.Optional("motion", default={}): MOTION_SCHEMA,
                vol.Optional("detect", default={}): DETECT_SCHEMA,
            }
        },
        vol.Msg(
            ensure_zones_and_cameras_have_different_names,
            msg="Zones cannot share names with cameras",
        ),
    )
)


@dataclasses.dataclass
class CameraSnapshotsConfig:
    enabled: bool
    timestamp: bool
    bounding_box: bool
    crop: bool
    required_zones: List[str]
    height: Optional[int]
    retain: RetainConfig

    @classmethod
    def build(self, config, global_config) -> CameraSnapshotsConfig:
        return CameraSnapshotsConfig(
            enabled=config["enabled"],
            timestamp=config["timestamp"],
            bounding_box=config["bounding_box"],
            crop=config["crop"],
            required_zones=config["required_zones"],
            height=config.get("height"),
            retain=RetainConfig.build(
                config["retain"], global_config["snapshots"]["retain"]
            ),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "timestamp": self.timestamp,
            "bounding_box": self.bounding_box,
            "crop": self.crop,
            "height": self.height,
            "retain": self.retain.to_dict(),
            "required_zones": self.required_zones,
        }


@dataclasses.dataclass
class CameraMqttConfig:
    enabled: bool
    timestamp: bool
    bounding_box: bool
    crop: bool
    height: int
    required_zones: List[str]

    @classmethod
    def build(cls, config) -> CameraMqttConfig:
        return CameraMqttConfig(
            config["enabled"],
            config["timestamp"],
            config["bounding_box"],
            config["crop"],
            config.get("height"),
            config["required_zones"],
        )

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


@dataclasses.dataclass
class CameraClipsConfig:
    enabled: bool
    pre_capture: int
    post_capture: int
    required_zones: List[str]
    objects: Optional[List[str]]
    retain: RetainConfig

    @classmethod
    def build(cls, config, global_config) -> CameraClipsConfig:
        return CameraClipsConfig(
            enabled=config["enabled"],
            pre_capture=config["pre_capture"],
            post_capture=config["post_capture"],
            required_zones=config["required_zones"],
            objects=config.get("objects"),
            retain=RetainConfig.build(
                config["retain"],
                global_config["clips"]["retain"],
            ),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "pre_capture": self.pre_capture,
            "post_capture": self.post_capture,
            "objects": self.objects,
            "retain": self.retain.to_dict(),
            "required_zones": self.required_zones,
        }


@dataclasses.dataclass
class CameraRtmpConfig:
    enabled: bool

    @classmethod
    def build(cls, config) -> CameraRtmpConfig:
        return CameraRtmpConfig(config["enabled"])

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


@dataclasses.dataclass(frozen=True)
class CameraConfig:
    name: str
    ffmpeg: CameraFfmpegConfig
    height: int
    width: int
    fps: Optional[int]
    best_image_timeout: int
    zones: Dict[str, ZoneConfig]
    clips: CameraClipsConfig
    record: RecordConfig
    rtmp: CameraRtmpConfig
    snapshots: CameraSnapshotsConfig
    mqtt: CameraMqttConfig
    objects: ObjectConfig
    motion: MotionConfig
    detect: DetectConfig

    @property
    def frame_shape(self) -> Tuple[int, int]:
        return self.height, self.width

    @property
    def frame_shape_yuv(self) -> Tuple[int, int]:
        return self.height * 3 // 2, self.width

    @property
    def ffmpeg_cmds(self) -> List[Dict[str, List[str]]]:
        ffmpeg_cmds = []
        for ffmpeg_input in self.ffmpeg.inputs:
            ffmpeg_cmd = self._get_ffmpeg_cmd(ffmpeg_input)
            if ffmpeg_cmd is None:
                continue

            ffmpeg_cmds.append({"roles": ffmpeg_input.roles, "cmd": ffmpeg_cmd})
        return ffmpeg_cmds

    @classmethod
    def build(cls, name, config, global_config) -> CameraConfig:
        colors = plt.cm.get_cmap("tab10", len(config["zones"]))
        zones = {
            name: ZoneConfig.build(z, tuple(round(255 * c) for c in colors(idx)[:3]))
            for idx, (name, z) in enumerate(config["zones"].items())
        }

        frame_shape = config["height"], config["width"]

        return CameraConfig(
            name=name,
            ffmpeg=CameraFfmpegConfig.build(config["ffmpeg"], global_config["ffmpeg"]),
            height=config["height"],
            width=config["width"],
            fps=config.get("fps"),
            best_image_timeout=config["best_image_timeout"],
            zones=zones,
            clips=CameraClipsConfig.build(config["clips"], global_config),
            record=RecordConfig.build(config["record"], global_config["record"]),
            rtmp=CameraRtmpConfig.build(config["rtmp"]),
            snapshots=CameraSnapshotsConfig.build(config["snapshots"], global_config),
            mqtt=CameraMqttConfig.build(config["mqtt"]),
            objects=ObjectConfig.build(
                config.get("objects", {}), global_config["objects"], frame_shape
            ),
            motion=MotionConfig.build(
                config["motion"], global_config["motion"], frame_shape
            ),
            detect=DetectConfig.build(
                config["detect"], global_config["detect"], config.get("fps", 5)
            ),
        )

    def _get_ffmpeg_cmd(self, ffmpeg_input):
        ffmpeg_output_args = []
        if "detect" in ffmpeg_input.roles:
            ffmpeg_output_args = (
                self.ffmpeg.output_args["detect"] + ffmpeg_output_args + ["pipe:"]
            )
            if self.fps:
                ffmpeg_output_args = ["-r", str(self.fps)] + ffmpeg_output_args
        if "rtmp" in ffmpeg_input.roles and self.rtmp.enabled:
            ffmpeg_output_args = (
                self.ffmpeg.output_args["rtmp"]
                + [f"rtmp://127.0.0.1/live/{self.name}"]
                + ffmpeg_output_args
            )
        if "clips" in ffmpeg_input.roles:
            ffmpeg_output_args = (
                self.ffmpeg.output_args["clips"]
                + [f"{os.path.join(CACHE_DIR, self.name)}-%Y%m%d%H%M%S.mp4"]
                + ffmpeg_output_args
            )
        if "record" in ffmpeg_input.roles and self.record.enabled:
            ffmpeg_output_args = (
                self.ffmpeg.output_args["record"]
                + [f"{os.path.join(RECORD_DIR, self.name)}-%Y%m%d%H%M%S.mp4"]
                + ffmpeg_output_args
            )

        # if there arent any outputs enabled for this input
        if len(ffmpeg_output_args) == 0:
            return None

        cmd = (
            ["ffmpeg"]
            + ffmpeg_input.global_args
            + ffmpeg_input.hwaccel_args
            + ffmpeg_input.input_args
            + ["-i", ffmpeg_input.path]
            + ffmpeg_output_args
        )

        return [part for part in cmd if part != ""]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "height": self.height,
            "width": self.width,
            "fps": self.fps,
            "best_image_timeout": self.best_image_timeout,
            "zones": {k: z.to_dict() for k, z in self.zones.items()},
            "clips": self.clips.to_dict(),
            "record": self.record.to_dict(),
            "rtmp": self.rtmp.to_dict(),
            "snapshots": self.snapshots.to_dict(),
            "mqtt": self.mqtt.to_dict(),
            "objects": self.objects.to_dict(),
            "motion": self.motion.to_dict(),
            "detect": self.detect.to_dict(),
            "frame_shape": self.frame_shape,
            "ffmpeg_cmds": [
                {"roles": c["roles"], "cmd": " ".join(c["cmd"])}
                for c in self.ffmpeg_cmds
            ],
        }


FRIGATE_CONFIG_SCHEMA = vol.Schema(
    {
        vol.Optional("database", default={}): {
            vol.Optional("path", default=os.path.join(BASE_DIR, "frigate.db")): str
        },
        vol.Optional("model", default={"width": 320, "height": 320}): {
            vol.Required("width"): int,
            vol.Required("height"): int,
        },
        vol.Optional("detectors", default=DEFAULT_DETECTORS): DETECTORS_SCHEMA,
        "mqtt": MQTT_SCHEMA,
        vol.Optional("logger", default={}): {
            vol.Optional("default", default="info"): vol.In(
                ["info", "debug", "warning", "error", "critical"]
            ),
            vol.Optional("logs", default={}): {
                str: vol.In(["info", "debug", "warning", "error", "critical"])
            },
        },
        vol.Optional("snapshots", default={}): {
            vol.Optional("retain", default={}): RETAIN_SCHEMA
        },
        vol.Optional("clips", default={}): CLIPS_SCHEMA,
        vol.Optional("record", default={}): {
            vol.Optional("enabled", default=False): bool,
            vol.Optional("retain_days", default=30): int,
        },
        vol.Optional("ffmpeg", default={}): GLOBAL_FFMPEG_SCHEMA,
        vol.Optional("objects", default={}): OBJECTS_SCHEMA,
        vol.Optional("motion", default={}): MOTION_SCHEMA,
        vol.Optional("detect", default={}): GLOBAL_DETECT_SCHEMA,
        vol.Required("cameras", default={}): CAMERAS_SCHEMA,
        vol.Optional("environment_vars", default={}): {str: str},
    }
)


@dataclasses.dataclass(frozen=True)
class DatabaseConfig:
    path: str

    @classmethod
    def build(cls, config) -> DatabaseConfig:
        return DatabaseConfig(config["path"])

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


@dataclasses.dataclass(frozen=True)
class ModelConfig:
    width: int
    height: int

    @classmethod
    def build(cls, config) -> ModelConfig:
        return ModelConfig(config["width"], config["height"])

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


@dataclasses.dataclass(frozen=True)
class LoggerConfig:
    default: str
    logs: Dict[str, str]

    @classmethod
    def build(cls, config) -> LoggerConfig:
        return LoggerConfig(
            config["default"].upper(),
            {k: v.upper() for k, v in config["logs"].items()},
        )

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


@dataclasses.dataclass(frozen=True)
class SnapshotsConfig:
    retain: RetainConfig

    @classmethod
    def build(cls, config) -> SnapshotsConfig:
        return SnapshotsConfig(RetainConfig.build(config["retain"]))

    def to_dict(self) -> Dict[str, Any]:
        return {"retain": self.retain.to_dict()}


@dataclasses.dataclass
class RecordConfig:
    enabled: bool
    retain_days: int

    @classmethod
    def build(cls, config, global_config) -> RecordConfig:
        return RecordConfig(
            config.get("enabled", global_config["enabled"]),
            config.get("retain_days", global_config["retain_days"]),
        )

    def to_dict(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


class FrigateConfig:
    def __init__(self, config_file=None, config=None) -> None:
        if config is None and config_file is None:
            raise ValueError("config or config_file must be defined")
        elif not config_file is None:
            config = self._load_file(config_file)

        config = FRIGATE_CONFIG_SCHEMA(config)

        config = self._sub_env_vars(config)

        self._database = DatabaseConfig.build(config["database"])
        self._model = ModelConfig.build(config["model"])
        self._detectors = {
            name: DetectorConfig.build(d) for name, d in config["detectors"].items()
        }
        self._mqtt = MqttConfig.build(config["mqtt"])
        self._clips = ClipsConfig.build(config["clips"])
        self._snapshots = SnapshotsConfig.build(config["snapshots"])
        self._cameras = {
            name: CameraConfig.build(name, c, config)
            for name, c in config["cameras"].items()
        }
        self._logger = LoggerConfig.build(config["logger"])
        self._environment_vars = config["environment_vars"]

    def _sub_env_vars(self, config):
        frigate_env_vars = {
            k: v for k, v in os.environ.items() if k.startswith("FRIGATE_")
        }

        if "password" in config["mqtt"]:
            config["mqtt"]["password"] = config["mqtt"]["password"].format(
                **frigate_env_vars
            )

        for camera in config["cameras"].values():
            for i in camera["ffmpeg"]["inputs"]:
                i["path"] = i["path"].format(**frigate_env_vars)

        return config

    def _load_file(self, config_file):
        with open(config_file) as f:
            raw_config = f.read()

        if config_file.endswith(".yml"):
            config = yaml.safe_load(raw_config)
        elif config_file.endswith(".json"):
            config = json.loads(raw_config)

        return config

    def to_dict(self) -> Dict[str, Any]:
        return {
            "database": self.database.to_dict(),
            "model": self.model.to_dict(),
            "detectors": {k: d.to_dict() for k, d in self.detectors.items()},
            "mqtt": self.mqtt.to_dict(),
            "clips": self.clips.to_dict(),
            "snapshots": self.snapshots.to_dict(),
            "cameras": {k: c.to_dict() for k, c in self.cameras.items()},
            "logger": self.logger.to_dict(),
            "environment_vars": self._environment_vars,
        }

    @property
    def database(self) -> DatabaseConfig:
        return self._database

    @property
    def model(self) -> ModelConfig:
        return self._model

    @property
    def detectors(self) -> Dict[str, DetectorConfig]:
        return self._detectors

    @property
    def logger(self) -> LoggerConfig:
        return self._logger

    @property
    def mqtt(self) -> MqttConfig:
        return self._mqtt

    @property
    def clips(self) -> ClipsConfig:
        return self._clips

    @property
    def snapshots(self) -> SnapshotsConfig:
        return self._snapshots

    @property
    def cameras(self) -> Dict[str, CameraConfig]:
        return self._cameras

    @property
    def environment_vars(self):
        return self._environment_vars
