"""Features section: enrichments, GenAI, integrations, and users."""

from collections import Counter

from frigate.analytics.collectors.common import closed, histogram
from frigate.analytics.context import ReportContext
from frigate.analytics.schema import (
    BirdseyeUsage,
    ClassificationUsage,
    EnrichmentDevice,
    EnrichmentUsage,
    FeaturesSection,
    GenAIUsage,
    SemanticSearchModel,
    SemanticSearchUsage,
    TranscriptionModel,
    TranscriptionUsage,
    UserRole,
)
from frigate.config.camera.genai import GenAIProviderEnum, GenAIRoleEnum
from frigate.const import REPLAY_CAMERA_PREFIX
from frigate.models import User

RUNTIME_DEVICES = {
    "cpu": EnrichmentDevice.cpu,
    "cuda": EnrichmentDevice.cuda,
    "tensorrt": EnrichmentDevice.tensorrt,
    "migraphx": EnrichmentDevice.migraphx,
}
OPENVINO_DEVICES = {
    "cpu": EnrichmentDevice.openvino_cpu,
    "gpu": EnrichmentDevice.openvino_gpu,
    "npu": EnrichmentDevice.openvino_npu,
}


def enrichment_device(label: object) -> EnrichmentDevice | None:
    """Map a runner's device label, like "CUDA" or "OpenVINO GPU.0,CPU"."""
    if not isinstance(label, str) or not label:
        return None

    runtime, _, target = label.partition(" ")

    if runtime == "OpenVINO":
        first = target.split(",")[0].split(".")[0].strip().lower()
        return OPENVINO_DEVICES.get(first, EnrichmentDevice.other)

    return RUNTIME_DEVICES.get(label.lower(), EnrichmentDevice.other)


def model_name(model: object) -> str | None:
    if model is None:
        return None

    return str(getattr(model, "value", model))


def semantic_model(model: object) -> SemanticSearchModel | None:
    # any string that isn't a built-in model names a GenAI provider
    name = model_name(model)

    if name is None:
        return None

    if name in ("jinav1", "jinav2"):
        return SemanticSearchModel(name)

    return SemanticSearchModel.genai


def transcription_model(model: object) -> TranscriptionModel | None:
    name = model_name(model)

    if name is None:
        return None

    return TranscriptionModel.whisper if name == "whisper" else TranscriptionModel.genai


def users() -> dict[UserRole, int]:
    roles: Counter[UserRole] = Counter(
        closed(UserRole, user.role, UserRole.custom) for user in User.select(User.role)
    )
    return histogram(roles)


def collect(ctx: ReportContext) -> FeaturesSection:
    config = ctx.config
    devices = ctx.stats.get("embeddings", {}).get("devices", {})
    cameras = [
        camera
        for name, camera in config.cameras.items()
        if not name.startswith(REPLAY_CAMERA_PREFIX)
    ]
    providers: Counter[GenAIProviderEnum] = Counter(
        genai.provider for genai in config.genai.values()
    )
    roles: Counter[GenAIRoleEnum] = Counter(
        role for genai in config.genai.values() for role in genai.roles
    )
    custom = list(config.classification.custom.values())

    return FeaturesSection(
        face_recognition=EnrichmentUsage(
            enabled=config.face_recognition.enabled,
            model_size=config.face_recognition.model_size,
            device=enrichment_device(devices.get("face_recognition")),
        ),
        lpr=EnrichmentUsage(
            enabled=config.lpr.enabled,
            model_size=config.lpr.model_size,
            device=enrichment_device(devices.get("lpr")),
        ),
        semantic_search=SemanticSearchUsage(
            enabled=config.semantic_search.enabled,
            model=semantic_model(config.semantic_search.model),
            model_size=config.semantic_search.model_size,
            device=enrichment_device(devices.get("semantic_search")),
            triggers=sum(len(camera.semantic_search.triggers) for camera in cameras),
        ),
        audio_transcription=TranscriptionUsage(
            enabled=config.audio_transcription.enabled,
            model=transcription_model(config.audio_transcription.model),
            model_size=config.audio_transcription.model_size,
        ),
        genai=GenAIUsage(providers=histogram(providers), roles=histogram(roles)),
        classification_models=ClassificationUsage(
            state=sum(1 for model in custom if model.state_config is not None),
            object=sum(1 for model in custom if model.object_config is not None),
        ),
        birdseye=BirdseyeUsage(
            enabled=config.birdseye.enabled,
            modes=list(config.birdseye.modes),
            restream=config.birdseye.restream,
        ),
        mqtt=config.mqtt.enabled,
        notifications=config.notifications.enabled,
        auth=config.auth.enabled,
        proxy_auth=config.proxy.header_map.user is not None,
        tls=config.tls.enabled,
        users=users(),
        camera_groups=len(config.camera_groups),
        profiles=len(config.profiles),
        plus_api_key=config.plus_api.is_active(),
    )
