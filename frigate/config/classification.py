from enum import Enum
from typing import Dict, List, Optional

from pydantic import ConfigDict, Field

from .base import FrigateBaseModel

__all__ = [
    "CameraFaceRecognitionConfig",
    "CameraLicensePlateRecognitionConfig",
    "CameraAudioTranscriptionConfig",
    "FaceRecognitionConfig",
    "SemanticSearchConfig",
    "CameraSemanticSearchConfig",
    "LicensePlateRecognitionConfig",
]


class SemanticSearchModelEnum(str, Enum):
    jinav1 = "jinav1"
    jinav2 = "jinav2"


class EnrichmentsDeviceEnum(str, Enum):
    GPU = "GPU"
    CPU = "CPU"


class TriggerType(str, Enum):
    THUMBNAIL = "thumbnail"
    DESCRIPTION = "description"


class TriggerAction(str, Enum):
    NOTIFICATION = "notification"
    SUB_LABEL = "sub_label"
    ATTRIBUTE = "attribute"


class ObjectClassificationType(str, Enum):
    sub_label = "sub_label"
    attribute = "attribute"


class AudioTranscriptionConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable audio transcription",
        description="Enable or disable automatic audio transcription for all cameras; can be overridden per-camera.",
    )
    language: str = Field(
        default="en",
        title="Transcription language",
        description="Language code used for transcription/translation (for example 'en' for English). See https://whisper-api.com/docs/languages/ for supported language codes.",
    )
    device: Optional[EnrichmentsDeviceEnum] = Field(
        default=EnrichmentsDeviceEnum.CPU,
        title="Transcription device",
        description="Device key (CPU/GPU) to run the transcription model on. Only NVIDIA CUDA GPUs are currently supported for transcription.",
    )
    model_size: str = Field(
        default="small",
        title="Model size",
        description="Model size to use for offline audio event transcription.",
    )
    live_enabled: Optional[bool] = Field(
        default=False,
        title="Live transcription",
        description="Enable streaming live transcription for audio as it is received.",
    )


class BirdClassificationConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Bird classification",
        description="Enable or disable bird classification.",
    )
    threshold: float = Field(
        default=0.9,
        title="Minimum score",
        description="Minimum classification score required to accept a bird classification.",
        gt=0.0,
        le=1.0,
    )


class CustomClassificationStateCameraConfig(FrigateBaseModel):
    crop: list[float, float, float, float] = Field(
        title="Classification crop",
        description="Crop coordinates to use for running classification on this camera.",
    )


class CustomClassificationStateConfig(FrigateBaseModel):
    cameras: Dict[str, CustomClassificationStateCameraConfig] = Field(
        title="Classification cameras",
        description="Per-camera crop and settings for running state classification.",
    )
    motion: bool = Field(
        default=False,
        title="Run on motion",
        description="If true, run classification when motion is detected within the specified crop.",
    )
    interval: int | None = Field(
        default=None,
        title="Classification interval",
        description="Interval (seconds) between periodic classification runs for state classification.",
        gt=0,
    )


class CustomClassificationObjectConfig(FrigateBaseModel):
    objects: list[str] = Field(
        default_factory=list,
        title="Classify objects",
        description="List of object types to run object classification on.",
    )
    classification_type: ObjectClassificationType = Field(
        default=ObjectClassificationType.sub_label,
        title="Classification type",
        description="Classification type applied: 'sub_label' (adds sub_label) or other supported types.",
    )


class CustomClassificationConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=True,
        title="Enable model",
        description="Enable or disable the custom classification model.",
    )
    name: str | None = Field(
        default=None,
        title="Model name",
        description="Identifier for the custom classification model to use.",
    )
    threshold: float = Field(
        default=0.8,
        title="Score threshold",
        description="Score threshold used to change the classification state.",
    )
    save_attempts: int | None = Field(
        default=None,
        title="Save attempts",
        description="How many classification attempts to save for recent classifications UI.",
        ge=0,
    )
    object_config: CustomClassificationObjectConfig | None = Field(default=None)
    state_config: CustomClassificationStateConfig | None = Field(default=None)


class ClassificationConfig(FrigateBaseModel):
    bird: BirdClassificationConfig = Field(
        default_factory=BirdClassificationConfig,
        title="Bird classification config",
        description="Settings specific to bird classification models.",
    )
    custom: Dict[str, CustomClassificationConfig] = Field(
        default={},
        title="Custom Classification Models",
        description="Configuration for custom classification models used for objects or state detection.",
    )


class SemanticSearchConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable semantic search",
        description="Enable or disable the semantic search feature.",
    )
    reindex: Optional[bool] = Field(
        default=False,
        title="Reindex on startup",
        description="Trigger a full reindex of historical tracked objects into the embeddings database.",
    )
    model: Optional[SemanticSearchModelEnum] = Field(
        default=SemanticSearchModelEnum.jinav1,
        title="Semantic search model",
        description="The embeddings model to use for semantic search (for example 'jinav1').",
    )
    model_size: str = Field(
        default="small",
        title="Model size",
        description="Select model size; 'small' runs on CPU and 'large' typically requires GPU.",
    )
    device: Optional[str] = Field(
        default=None,
        title="Device",
        description="This is an override, to target a specific device. See https://onnxruntime.ai/docs/execution-providers/ for more information",
    )


class TriggerConfig(FrigateBaseModel):
    friendly_name: Optional[str] = Field(
        None,
        title="Friendly name",
        description="Optional friendly name displayed in the UI for this trigger.",
    )
    enabled: bool = Field(
        default=True,
        title="Enable this trigger",
        description="Enable or disable this semantic search trigger.",
    )
    type: TriggerType = Field(
        default=TriggerType.DESCRIPTION,
        title="Trigger type",
        description="Type of trigger: 'thumbnail' (match against image) or 'description' (match against text).",
    )
    data: str = Field(
        title="Trigger content",
        description="Text phrase or thumbnail ID to match against tracked objects.",
    )
    threshold: float = Field(
        title="Trigger threshold",
        description="Minimum similarity score (0-1) required to activate this trigger.",
        default=0.8,
        gt=0.0,
        le=1.0,
    )
    actions: List[TriggerAction] = Field(
        default=[],
        title="Trigger actions",
        description="List of actions to execute when trigger matches (notification, sub_label, attribute).",
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class CameraSemanticSearchConfig(FrigateBaseModel):
    triggers: Dict[str, TriggerConfig] = Field(
        default={},
        title="Triggers",
        description="Actions and matching criteria for camera-specific semantic search triggers.",
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class FaceRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable face recognition",
        description="Enable or disable face recognition for all cameras; can be overridden per-camera.",
    )
    model_size: str = Field(
        default="small",
        title="Model size",
        description="Model size to use for face embeddings (small/large); larger may require GPU.",
    )
    unknown_score: float = Field(
        title="Unknown score threshold",
        description="Distance threshold below which a face is considered a potential match (higher = stricter).",
        default=0.8,
        gt=0.0,
        le=1.0,
    )
    detection_threshold: float = Field(
        default=0.7,
        title="Detection threshold",
        description="Minimum detection confidence required to consider a face detection valid.",
        gt=0.0,
        le=1.0,
    )
    recognition_threshold: float = Field(
        default=0.9,
        title="Recognition threshold",
        description="Face embedding distance threshold to consider two faces a match.",
        gt=0.0,
        le=1.0,
    )
    min_area: int = Field(
        default=750,
        title="Minimum face area",
        description="Minimum area (pixels) of a detected face box required to attempt recognition.",
    )
    min_faces: int = Field(
        default=1,
        gt=0,
        le=6,
        title="Minimum faces",
        description="Minimum number of face recognitions required before applying a recognized sub-label to a person.",
    )
    save_attempts: int = Field(
        default=200,
        ge=0,
        title="Save attempts",
        description="Number of face recognition attempts to retain for recent recognition UI.",
    )
    blur_confidence_filter: bool = Field(
        default=True,
        title="Blur confidence filter",
        description="Adjust confidence scores based on image blur to reduce false positives for poor quality faces.",
    )
    device: Optional[str] = Field(
        default=None,
        title="Device",
        description="This is an override, to target a specific device. See https://onnxruntime.ai/docs/execution-providers/ for more information",
    )


class CameraFaceRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable face recognition",
        description="Enable or disable face recognition.",
    )
    min_area: int = Field(
        default=750,
        title="Minimum face area",
        description="Minimum area (pixels) of a detected face box required to attempt recognition.",
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class ReplaceRule(FrigateBaseModel):
    pattern: str = Field(..., title="Regex pattern")
    replacement: str = Field(..., title="Replacement string")


class LicensePlateRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable LPR",
        description="Enable or disable license plate recognition for all cameras; can be overridden per-camera.",
    )
    model_size: str = Field(
        default="small",
        title="Model size",
        description="Model size used for text detection/recognition. Most users should use 'small'.",
    )
    detection_threshold: float = Field(
        default=0.7,
        title="Detection threshold",
        description="Detection confidence threshold to begin running OCR on a suspected plate.",
        gt=0.0,
        le=1.0,
    )
    min_area: int = Field(
        default=1000,
        title="Minimum plate area",
        description="Minimum plate area (pixels) required to attempt recognition.",
    )
    recognition_threshold: float = Field(
        default=0.9,
        title="Recognition threshold",
        description="Confidence threshold required for recognized plate text to be attached as a sub-label.",
        gt=0.0,
        le=1.0,
    )
    min_plate_length: int = Field(
        default=4,
        title="Min plate length",
        description="Minimum number of characters a recognized plate must contain to be considered valid.",
    )
    format: Optional[str] = Field(
        default=None,
        title="Plate format regex",
        description="Optional regex to validate recognized plate strings against an expected format.",
    )
    match_distance: int = Field(
        default=1,
        title="Match distance",
        description="Number of character mismatches allowed when comparing detected plates to known plates.",
        ge=0,
    )
    known_plates: Optional[Dict[str, List[str]]] = Field(
        default={},
        title="Known plates",
        description="List of plates or regexes to specially track or alert on.",
    )
    enhancement: int = Field(
        default=0,
        title="Enhancement level",
        description="Enhancement level (0-10) to apply to plate crops prior to OCR; higher values may not always improve results, levels above 5 may only work with night time plates and should be used with caution.",
        ge=0,
        le=10,
    )
    debug_save_plates: bool = Field(
        default=False,
        title="Save debug plates",
        description="Save plate crop images for debugging LPR performance.",
    )
    device: Optional[str] = Field(
        default=None,
        title="Device",
        description="This is an override, to target a specific device. See https://onnxruntime.ai/docs/execution-providers/ for more information",
    )
    replace_rules: List[ReplaceRule] = Field(
        default_factory=list,
        title="Replacement rules",
        description="Regex replacement rules used to normalize detected plate strings before matching.",
    )


class CameraLicensePlateRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable LPR",
        description="Enable or disable LPR on this camera.",
    )
    expire_time: int = Field(
        default=3,
        title="Expire seconds",
        description="Time in seconds after which an unseen plate is expired from the tracker (for dedicated LPR cameras only).",
        gt=0,
    )
    min_area: int = Field(
        default=1000,
        title="Minimum plate area",
        description="Minimum plate area (pixels) required to attempt recognition.",
    )
    enhancement: int = Field(
        default=0,
        title="Enhancement level",
        description="Enhancement level (0-10) to apply to plate crops prior to OCR; higher values may not always improve results, levels above 5 may only work with night time plates and should be used with caution.",
        ge=0,
        le=10,
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class CameraAudioTranscriptionConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable transcription",
        description="Enable or disable manually triggered audio event transcription.",
    )
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Original transcription state"
    )
    live_enabled: Optional[bool] = Field(
        default=False,
        title="Live transcription",
        description="Enable streaming live transcription for audio as it is received.",
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())
