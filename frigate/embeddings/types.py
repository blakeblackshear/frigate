from enum import Enum


class EmbeddingTypeEnum(str, Enum):
    thumbnail = "thumbnail"
    description = "description"


class EnrichmentModelTypeEnum(str, Enum):
    arcface = "arcface"
    facenet = "facenet"
    jina_v1 = "jina_v1"
    jina_v2 = "jina_v2"
    paddleocr = "paddleocr"
    yolov9_license_plate = "yolov9_license_plate"


# which enrichment each model type belongs to; the single place this lives
ENRICHMENT_FOR_MODEL_TYPE: dict[str, str] = {
    EnrichmentModelTypeEnum.arcface.value: "face_recognition",
    EnrichmentModelTypeEnum.facenet.value: "face_recognition",
    EnrichmentModelTypeEnum.jina_v1.value: "semantic_search",
    EnrichmentModelTypeEnum.jina_v2.value: "semantic_search",
    EnrichmentModelTypeEnum.paddleocr.value: "lpr",
    EnrichmentModelTypeEnum.yolov9_license_plate.value: "lpr",
}


def fold_runtime_devices(loaded: dict[str, tuple[str, str]]) -> dict[str, str]:
    """One device per enrichment from the per model registry.

    A non CPU device wins so a model pinned to the CPU on purpose (the Jina V1
    text model) does not hide the accelerator its sibling loaded on, while an
    enrichment whose models all fell back to the CPU still reports CPU.
    """
    folded: dict[str, str] = {}

    for model_type, device in loaded.values():
        enrichment = ENRICHMENT_FOR_MODEL_TYPE.get(model_type)

        if enrichment is None:
            continue

        current = folded.get(enrichment)

        if current is None or ("CPU" in current and "CPU" not in device):
            folded[enrichment] = device

    return folded
