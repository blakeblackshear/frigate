"""Cameras section: counts and histograms across cameras, never per camera."""

from collections import Counter
from typing import Any
from urllib.parse import urlsplit

from frigate.analytics.collectors.common import closed, histogram
from frigate.analytics.context import ReportContext
from frigate.analytics.schema import (
    CamerasSection,
    ConnectionQuality,
    FpsBucket,
    HeightBucket,
    HwaccelKey,
    InputPresetKey,
    RetainBucket,
    RetainDays,
)
from frigate.config import CameraConfig
from frigate.config.camera.camera import CameraTypeEnum
from frigate.config.camera.ffmpeg import CameraInput, CameraRoleEnum
from frigate.const import REPLAY_CAMERA_PREFIX

# the upper edge of every height bucket but the last
HEIGHT_BUCKETS = (
    (360, HeightBucket.le_360),
    (540, HeightBucket.h480),
    (900, HeightBucket.h720),
    (1260, HeightBucket.h1080),
    (1800, HeightBucket.h1440),
)
RESTREAM_HOSTS = frozenset({"127.0.0.1", "localhost"})
RESTREAM_PORT = 8554
QUALITIES = frozenset(ConnectionQuality)


def height_bucket(height: int) -> HeightBucket:
    for limit, bucket in HEIGHT_BUCKETS:
        if height <= limit:
            return bucket

    return HeightBucket.ge_2160


def fps_bucket(fps: int) -> FpsBucket:
    if fps <= 5:
        return FpsBucket.le_5

    if fps <= 10:
        return FpsBucket.f6_10

    return FpsBucket.gt_10


def retain_bucket(days: float) -> RetainBucket:
    if days <= 0:
        return RetainBucket.zero

    if days <= 7:
        return RetainBucket.d1_7

    if days <= 30:
        return RetainBucket.d8_30

    return RetainBucket.gt_30


def preset_key(args: str | list[str], enum: Any) -> Any:
    """The preset's name, custom for hand written args, or none."""
    if not args:
        return enum("none")

    if isinstance(args, str) and args.startswith("preset-"):
        return closed(enum, args.removeprefix("preset-"), enum("custom"))

    return enum("custom")


def is_restream(path: str) -> bool:
    try:
        url = urlsplit(path)
        return url.hostname in RESTREAM_HOSTS and url.port == RESTREAM_PORT
    except ValueError:
        return False


def role_input(camera: CameraConfig, role: CameraRoleEnum) -> CameraInput | None:
    return next((i for i in camera.ffmpeg.inputs if role in i.roles), None)


def object_masks(camera: CameraConfig) -> int:
    # parsing copies camera-wide masks into every filter as global_<id>
    own = sum(1 for mask in camera.objects.mask.values() if mask is not None)
    per_label = sum(
        1
        for label_filter in camera.objects.filters.values()
        for mask_id, mask in label_filter.mask.items()
        if mask is not None and not mask_id.startswith("global_")
    )
    return own + per_label


def collect(ctx: ReportContext) -> CamerasSection:
    cameras = {
        name: camera
        for name, camera in ctx.config.cameras.items()
        if not name.startswith(REPLAY_CAMERA_PREFIX)
    }
    camera_stats = ctx.stats.get("cameras", {})

    flags: Counter[str] = Counter()
    types: Counter[CameraTypeEnum] = Counter()
    heights: Counter[HeightBucket] = Counter()
    fps: Counter[FpsBucket] = Counter()
    hwaccel: Counter[Any] = Counter()
    input_presets: Counter[Any] = Counter()
    quality: Counter[ConnectionQuality] = Counter()
    retain: dict[str, Counter[RetainBucket]] = {
        period: Counter() for period in ("continuous", "motion", "alerts", "detections")
    }

    for name, camera in cameras.items():
        detect_input = role_input(camera, CameraRoleEnum.detect)
        record_input = role_input(camera, CameraRoleEnum.record)

        # config validation requires a detect input, so this never skips
        if detect_input is None:
            continue

        types[camera.type] += 1
        fps[fps_bucket(camera.detect.fps)] += 1
        hwaccel[
            preset_key(
                detect_input.hwaccel_args or camera.ffmpeg.hwaccel_args, HwaccelKey
            )
        ] += 1
        input_presets[
            preset_key(
                detect_input.input_args or camera.ffmpeg.input_args, InputPresetKey
            )
        ] += 1

        if camera.detect.height:
            heights[height_bucket(camera.detect.height)] += 1

        state = camera_stats.get(name, {}).get("connection_quality")

        if state in QUALITIES:
            quality[ConnectionQuality(state)] += 1

        if camera.record.enabled:
            retain["continuous"][retain_bucket(camera.record.continuous.days)] += 1
            retain["motion"][retain_bucket(camera.record.motion.days)] += 1
            retain["alerts"][retain_bucket(camera.record.alerts.retain.days)] += 1
            retain["detections"][
                retain_bucket(camera.record.detections.retain.days)
            ] += 1

        zones = len(camera.zones)
        flags["enabled"] += camera.enabled
        flags["go2rtc_restream"] += any(
            is_restream(i.path) for i in camera.ffmpeg.inputs
        )
        flags["separate_detect_stream"] += (
            record_input is not None and record_input.path != detect_input.path
        )
        flags["detect"] += camera.detect.enabled
        flags["record"] += camera.record.enabled
        flags["sub_stream_record"] += camera.record.sub.enabled
        flags["snapshots"] += camera.snapshots.enabled
        flags["audio"] += camera.audio.enabled
        flags["audio_transcription"] += camera.audio_transcription.enabled
        flags["birdseye"] += camera.birdseye.enabled
        flags["onvif"] += bool(camera.onvif.host)
        flags["autotracking"] += camera.onvif.autotracking.enabled
        flags["face_recognition"] += camera.face_recognition.enabled
        flags["lpr"] += camera.lpr.enabled
        flags["review_genai"] += camera.review.genai.enabled
        flags["object_genai"] += camera.objects.genai.enabled
        flags["notifications"] += camera.notifications.enabled
        flags["zones"] += zones
        flags["cameras_with_zones"] += zones > 0
        flags["motion_masks"] += sum(
            1 for mask in camera.motion.mask.values() if mask is not None
        )
        flags["object_masks"] += object_masks(camera)

    return CamerasSection(
        total=len(cameras),
        enabled=flags["enabled"],
        types=histogram(types),
        detect_height=histogram(heights),
        detect_fps=histogram(fps),
        hwaccel=histogram(hwaccel),
        input_preset=histogram(input_presets),
        go2rtc_restream=flags["go2rtc_restream"],
        separate_detect_stream=flags["separate_detect_stream"],
        detect=flags["detect"],
        record=flags["record"],
        sub_stream_record=flags["sub_stream_record"],
        snapshots=flags["snapshots"],
        audio=flags["audio"],
        audio_transcription=flags["audio_transcription"],
        birdseye=flags["birdseye"],
        onvif=flags["onvif"],
        autotracking=flags["autotracking"],
        face_recognition=flags["face_recognition"],
        lpr=flags["lpr"],
        review_genai=flags["review_genai"],
        object_genai=flags["object_genai"],
        notifications=flags["notifications"],
        zones=flags["zones"],
        cameras_with_zones=flags["cameras_with_zones"],
        motion_masks=flags["motion_masks"],
        object_masks=flags["object_masks"],
        connection_quality=histogram(quality),
        retain_days=RetainDays(
            continuous=histogram(retain["continuous"]),
            motion=histogram(retain["motion"]),
            alerts=histogram(retain["alerts"]),
            detections=histogram(retain["detections"]),
        ),
    )
