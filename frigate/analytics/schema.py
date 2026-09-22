"""Models for the analytics report, the contract with the ingest endpoint.

Every field carries a description and an x-public flag, and no field accepts
user-entered text, so a report can't carry camera names or other free text.
"""

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from frigate.config.camera.birdseye import BirdseyeModeEnum
from frigate.config.camera.camera import CameraTypeEnum
from frigate.config.camera.genai import GenAIProviderEnum, GenAIRoleEnum
from frigate.config.classification import ModelSizeEnum
from frigate.detectors.detector_config import ModelTypeEnum, SceneEnum
from frigate.detectors.detector_types import DetectorTypeEnum
from frigate.ffmpeg_presets import PRESETS_HW_ACCEL_DECODE, PRESETS_INPUT
from frigate.notices.types import NOTICE_KINDS

SCHEMA_VERSION = 1


class ImageVariant(StrEnum):
    standard = "standard"
    rpi = "rpi"
    tensorrt = "tensorrt"
    tensorrt_jp6 = "tensorrt-jp6"
    rocm = "rocm"
    rk = "rk"
    synaptics = "synaptics"
    dev = "dev"
    other = "other"


class InstallType(StrEnum):
    ha_addon = "ha_addon"
    docker = "docker"
    podman = "podman"
    kubernetes = "kubernetes"
    unknown = "unknown"


class Arch(StrEnum):
    x86_64 = "x86_64"
    aarch64 = "aarch64"
    other = "other"


class GpuVendor(StrEnum):
    intel = "intel"
    amd = "amd"
    nvidia = "nvidia"
    rockchip = "rockchip"
    rpi = "rpi"
    other = "other"


class DecodeFamily(StrEnum):
    nvidia = "nvidia"
    vaapi = "vaapi"
    rkmpp = "rkmpp"
    intel_qsv = "intel-qsv"
    jetson = "jetson"
    rpi = "rpi"
    other = "other"


class HardwareKey(StrEnum):
    edgetpu_pci = "edgetpu:pci"
    edgetpu_usb = "edgetpu:usb"
    openvino_gpu = "openvino:GPU"
    openvino_npu = "openvino:NPU"
    onnx_amd = "onnx:amd"
    onnx_nvidia = "onnx:nvidia"
    tensorrt = "tensorrt"
    hailo = "hailo"
    memryx = "memryx"
    deepx = "deepx"
    rknn = "rknn"
    axengine = "axengine"
    synaptics = "synaptics"
    cpu = "cpu"
    other = "other"


class ModelSource(StrEnum):
    default = "default"
    plus = "plus"
    custom = "custom"


class HeightBucket(StrEnum):
    le_360 = "le_360"
    h480 = "480"
    h720 = "720"
    h1080 = "1080"
    h1440 = "1440"
    ge_2160 = "ge_2160"


class FpsBucket(StrEnum):
    le_5 = "le_5"
    f6_10 = "6_10"
    gt_10 = "gt_10"


class RetainBucket(StrEnum):
    zero = "0"
    d1_7 = "1_7"
    d8_30 = "8_30"
    gt_30 = "gt_30"


class ConnectionQuality(StrEnum):
    excellent = "excellent"
    fair = "fair"
    poor = "poor"
    unusable = "unusable"


class EnrichmentDevice(StrEnum):
    cpu = "cpu"
    cuda = "cuda"
    tensorrt = "tensorrt"
    migraphx = "migraphx"
    openvino_cpu = "openvino_cpu"
    openvino_gpu = "openvino_gpu"
    openvino_npu = "openvino_npu"
    other = "other"


class SemanticSearchModel(StrEnum):
    jinav1 = "jinav1"
    jinav2 = "jinav2"
    genai = "genai"


class TranscriptionModel(StrEnum):
    whisper = "whisper"
    genai = "genai"


class UserRole(StrEnum):
    admin = "admin"
    viewer = "viewer"
    custom = "custom"


class EnrichmentTiming(StrEnum):
    face = "face"
    lpr = "lpr"
    plate_detection = "plate_detection"
    image_embedding = "image_embedding"
    text_embedding = "text_embedding"
    review_description = "review_description"
    object_description = "object_description"


def _preset_keys(presets: dict[str, Any]) -> dict[str, str]:
    keys = [name.removeprefix("preset-") for name in presets]
    return {key: key for key in [*keys, "custom", "none"]}


# built from the registries they mirror, so a new preset or notice kind reaches
# the schema through generate_analytics_schema.py instead of a hand edit
HwaccelKey = StrEnum("HwaccelKey", _preset_keys(PRESETS_HW_ACCEL_DECODE))  # type: ignore[misc]
InputPresetKey = StrEnum("InputPresetKey", _preset_keys(PRESETS_INPUT))  # type: ignore[misc]
NoticeKindKey = StrEnum(  # type: ignore[misc]
    "NoticeKindKey",
    {key: key for key, kind in NOTICE_KINDS.items() if kind.reportable},
)


class AnalyticsModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


def metric(description: str, *, public: bool = True, **kwargs: Any) -> Any:
    """Declare a report field; the description and flag land in the schema."""
    return Field(
        description=description, json_schema_extra={"x-public": public}, **kwargs
    )


def count(description: str) -> Any:
    return metric(description, ge=0)


class InstallSection(AnalyticsModel):
    version: str = metric("Frigate version string", max_length=32)
    image_variant: ImageVariant = metric("Published image the install runs")
    install_type: InstallType = metric("How Frigate is installed")
    arch: Arch = metric("CPU architecture")
    kernel: str = metric(
        "Host kernel as major.minor", pattern=r"^(\d{1,3}\.\d{1,3}|unknown)$"
    )
    run_as_root: bool = metric("Whether the main process runs as root")


class GpuInfo(AnalyticsModel):
    vendor: GpuVendor = metric("GPU vendor")
    name: str = metric("GPU name as the hardware reports it", max_length=64)


class StorageInfo(AnalyticsModel):
    record_fs: str = metric("Filesystem of the recordings volume", max_length=16)
    record_total_gb: int = count("Size of the recordings volume in GB")
    record_used_pct: int = metric(
        "Percent of the recordings volume in use", ge=0, le=100
    )


class HardwareSection(AnalyticsModel):
    cpu_model: str = metric(
        "CPU or board model as the hardware reports it", max_length=64
    )
    cpu_cores: int = count("Logical CPU count")
    memory_gb: int = count("Total memory in GB")
    gpus: list[GpuInfo] = metric("GPUs the stats collector found")
    decode_families: list[DecodeFamily] = metric(
        "Hardware decode families this system can use"
    )
    detection_hardware: dict[HardwareKey, int] = metric(
        "Detection hardware found, as unit counts by kind"
    )
    storage: StorageInfo = metric("Recordings storage")


class DetectionModel(AnalyticsModel):
    detector: DetectorTypeEnum = metric("Detector type the model runs on")
    devices: int = count("Devices the model runs on")
    model_type: ModelTypeEnum = metric("Model architecture")
    input: str = metric("Model input size as WxH", pattern=r"^\d{1,5}x\d{1,5}$")
    source: ModelSource = metric("Where the model came from", public=False)
    inference_ms: float | None = metric(
        "Mean inference time across the model's detector processes, null before the first stats",
        ge=0,
    )


class DetectionSection(AnalyticsModel):
    models: dict[SceneEnum, DetectionModel] = metric("Detection models keyed by scene")
    detection_fps: float = metric("Detections per second across cameras", ge=0)
    skipped_fps: float = metric("Frames per second skipped across cameras", ge=0)


class RetainDays(AnalyticsModel):
    continuous: dict[RetainBucket, int] = metric(
        "Recording cameras by continuous retention in days"
    )
    motion: dict[RetainBucket, int] = metric(
        "Recording cameras by motion retention in days"
    )
    alerts: dict[RetainBucket, int] = metric(
        "Recording cameras by alert retention in days"
    )
    detections: dict[RetainBucket, int] = metric(
        "Recording cameras by detection retention in days"
    )


class CamerasSection(AnalyticsModel):
    total: int = count("Configured cameras")
    enabled: int = count("Enabled cameras")
    types: dict[CameraTypeEnum, int] = metric("Cameras by type")
    detect_height: dict[HeightBucket, int] = metric(
        "Cameras by detect resolution height"
    )
    detect_fps: dict[FpsBucket, int] = metric("Cameras by detect fps")
    hwaccel: dict[HwaccelKey, int] = metric(
        "Cameras by the resolved hwaccel preset of the detect input"
    )
    input_preset: dict[InputPresetKey, int] = metric(
        "Cameras by the input preset of the detect input"
    )
    go2rtc_restream: int = count("Cameras with an input from the go2rtc restream")
    separate_detect_stream: int = count(
        "Cameras whose detect input differs from their record input"
    )
    detect: int = count("Cameras with detection on")
    record: int = count("Cameras with recording on")
    sub_stream_record: int = count("Cameras with sub stream recording on")
    snapshots: int = count("Cameras with snapshots on")
    audio: int = count("Cameras with audio detection on")
    audio_transcription: int = count("Cameras with audio transcription on")
    birdseye: int = count("Cameras in birdseye")
    onvif: int = count("Cameras with an ONVIF host")
    autotracking: int = count("Cameras with PTZ autotracking on")
    face_recognition: int = count("Cameras with face recognition on")
    lpr: int = count("Cameras with license plate recognition on")
    review_genai: int = count("Cameras with GenAI review summaries on")
    object_genai: int = count("Cameras with GenAI object descriptions on")
    notifications: int = count("Cameras with notifications on")
    zones: int = count("Zones across cameras")
    cameras_with_zones: int = count("Cameras with at least one zone")
    motion_masks: int = count("Motion masks across cameras")
    object_masks: int = count("Object masks across cameras")
    connection_quality: dict[ConnectionQuality, int] = metric(
        "Cameras by connection quality at send time"
    )
    retain_days: RetainDays = metric("Recording retention")


class EnrichmentUsage(AnalyticsModel):
    enabled: bool = metric("Whether the enrichment is on")
    model_size: ModelSizeEnum = metric("Configured model size")
    device: EnrichmentDevice | None = metric(
        "Device the model loaded on, null when it isn't loaded"
    )


class SemanticSearchUsage(AnalyticsModel):
    enabled: bool = metric("Whether semantic search is on")
    model: SemanticSearchModel | None = metric(
        "Embedding model, genai for a GenAI provider"
    )
    model_size: ModelSizeEnum = metric("Configured model size")
    device: EnrichmentDevice | None = metric(
        "Device the model loaded on, null when it isn't loaded"
    )
    triggers: int = count("Semantic search triggers across cameras")


class TranscriptionUsage(AnalyticsModel):
    enabled: bool = metric("Whether audio transcription is on")
    model: TranscriptionModel | None = metric(
        "Transcription model, genai for a GenAI provider"
    )
    model_size: ModelSizeEnum = metric("Configured model size")


class GenAIUsage(AnalyticsModel):
    providers: dict[GenAIProviderEnum, int] = metric(
        "Configured GenAI providers by type"
    )
    roles: dict[GenAIRoleEnum, int] = metric("Configured GenAI providers by role")


class ClassificationUsage(AnalyticsModel):
    state: int = count("Custom state classification models")
    object: int = count("Custom object classification models")


class BirdseyeUsage(AnalyticsModel):
    enabled: bool = metric("Whether birdseye is on")
    modes: list[BirdseyeModeEnum] = metric("Birdseye modes")
    restream: bool = metric("Whether birdseye is restreamed")


class FeaturesSection(AnalyticsModel):
    face_recognition: EnrichmentUsage = metric("Face recognition")
    lpr: EnrichmentUsage = metric("License plate recognition")
    semantic_search: SemanticSearchUsage = metric("Semantic search")
    audio_transcription: TranscriptionUsage = metric("Audio transcription")
    genai: GenAIUsage = metric("Generative AI providers")
    classification_models: ClassificationUsage = metric("Custom classification models")
    birdseye: BirdseyeUsage = metric("Birdseye")
    mqtt: bool = metric("Whether MQTT is on")
    notifications: bool = metric("Whether web push notifications are on")
    auth: bool = metric("Whether authentication is on")
    proxy_auth: bool = metric("Whether a proxy supplies the user header")
    tls: bool = metric("Whether TLS is on")
    users: dict[UserRole, int] = metric("Users by role")
    camera_groups: int = count("Camera groups")
    profiles: int = count("Profiles")
    plus_api_key: bool = metric("Whether a Frigate+ API key is set", public=False)


class NoticeCounts(AnalyticsModel):
    occurrences: int = count("Occurrences since the last accepted report")
    dismissals: int = count("Dismissals since the last accepted report")


class HealthSection(AnalyticsModel):
    uptime_hours: int = count("Hours since Frigate started")
    cpu_percent: int = metric("System CPU use at send time", ge=0, le=100)
    enrichment_ms: dict[EnrichmentTiming, float] = metric(
        "Mean enrichment inference times in milliseconds"
    )
    retention_unmet: bool = metric(
        "Whether storage can't keep the configured retention"
    )
    notices: dict[NoticeKindKey, NoticeCounts] = metric(
        "Notice counts by kind since the last accepted report", public=False
    )


class AnalyticsReport(AnalyticsModel):
    schema_version: int = metric("Report format version", ge=1)
    install_id: str = metric(
        "Random install identifier", public=False, pattern=r"^[0-9a-f]{32}$"
    )
    report_id: str = metric(
        "Random identifier of this report",
        public=False,
        pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    )
    sent_at: int = count("Unix time the report was built")
    install: InstallSection | None = metric("Install, null if its collector failed")
    hardware: HardwareSection | None = metric("Hardware, null if its collector failed")
    detection: DetectionSection | None = metric(
        "Object detection, null if its collector failed"
    )
    cameras: CamerasSection | None = metric("Cameras, null if its collector failed")
    features: FeaturesSection | None = metric("Features, null if its collector failed")
    health: HealthSection | None = metric("Health, null if its collector failed")
