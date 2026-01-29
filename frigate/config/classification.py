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
        description="Enable or disable automatic audio transcription globally.",
    )
    language: str = Field(
        default="en",
        title="Language abbreviation to use for audio event transcription/translation",
        description="Language code used for transcription/translation (for example 'en' for English).",
    )
    device: Optional[EnrichmentsDeviceEnum] = Field(
        default=EnrichmentsDeviceEnum.CPU,
        title="The device used for audio transcription",
        description="Device key (CPU/GPU) to run the transcription model on.",
    )
    model_size: str = Field(
        default="small",
        title="The size of the embeddings model used",
        description="Model size to use for transcription; the small model runs on CPU, large model requires a GPU.",
    )
    live_enabled: Optional[bool] = Field(
        default=False,
        title="Enable live transcriptions",
        description="Enable streaming live transcription for audio as it is received.",
    )


class BirdClassificationConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable bird classification",
        description="Enable or disable bird classification.",
    )
    threshold: float = Field(
        default=0.9,
        title="Minimum classification score required to be considered a match",
        description="Minimum classification score required to accept a bird classification.",
        gt=0.0,
        le=1.0,
    )


class CustomClassificationStateCameraConfig(FrigateBaseModel):
    crop: list[float, float, float, float] = Field(
        title="Crop of image frame on this camera to run classification on",
        description="Crop coordinates to use for running classification on this camera.",
    )


class CustomClassificationStateConfig(FrigateBaseModel):
    cameras: Dict[str, CustomClassificationStateCameraConfig] = Field(
        title="Cameras to run classification on",
        description="Per-camera crop and settings for running state classification.",
    )
    motion: bool = Field(
        default=False,
        title="If classification should be run when motion is detected in the crop",
        description="If true, run classification when motion is detected within the specified crop.",
    )
    interval: int | None = Field(
        default=None,
        title="Interval to run classification on in seconds",
        description="Interval (seconds) between periodic classification runs for state classification.",
        gt=0,
    )


class CustomClassificationObjectConfig(FrigateBaseModel):
    objects: list[str] = Field(
        title="Object types to classify",
        description="List of object types to run object classification on.",
    )
    classification_type: ObjectClassificationType = Field(
        default=ObjectClassificationType.sub_label,
        title="Type of classification that is applied",
        description="Classification type applied: 'sub_label' (adds sub_label) or other supported types.",
    )


class CustomClassificationConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=True,
        title="Enable running the model",
        description="Enable or disable the custom classification model.",
    )
    name: str | None = Field(
        default=None,
        title="Name of classification model",
        description="Identifier for the custom classification model to use.",
    )
    threshold: float = Field(
        default=0.8,
        title="Classification score threshold to change the state",
        description="Score threshold used to change the classification state.",
    )
    save_attempts: int | None = Field(
        default=None,
        title="Number of classification attempts to save in the recent classifications tab. If not specified, defaults to 200 for object classification and 100 for state classification",
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
        title="Reindex all tracked objects on startup",
        description="Trigger a full reindex of historical tracked objects into the embeddings database.",
    )
    model: Optional[SemanticSearchModelEnum] = Field(
        default=SemanticSearchModelEnum.jinav1,
        title="The CLIP model to use for semantic search",
        description="The embeddings model to use for semantic search (for example 'jinav1').",
    )
    model_size: str = Field(
        default="small",
        title="The size of the embeddings model used",
        description="Select model size; 'small' runs on CPU and 'large' typically requires GPU.",
    )
    device: Optional[str] = Field(
        default=None,
        title="The device key to use for semantic search",
        description="This is an override, to target a specific device. See https://onnxruntime.ai/docs/execution-providers/ for more information",
    )


class TriggerConfig(FrigateBaseModel):
    friendly_name: Optional[str] = Field(
        None,
        title="Trigger friendly name used in the Frigate UI",
        description="Optional friendly name displayed in the UI for this trigger.",
    )
    enabled: bool = Field(
        default=True,
        title="Enable this trigger",
        description="Enable or disable this semantic search trigger.",
    )
    type: TriggerType = Field(
        default=TriggerType.DESCRIPTION,
        title="Type of trigger",
        description="Type of trigger: 'thumbnail' (match against image) or 'description' (match against text).",
    )
    data: str = Field(
        title="Trigger content (text phrase or image ID)",
        description="Text phrase or thumbnail ID to match against tracked objects.",
    )
    threshold: float = Field(
        title="Confidence score required to run the trigger",
        description="Minimum similarity score (0-1) required to activate this trigger.",
        default=0.8,
        gt=0.0,
        le=1.0,
    )
    actions: List[TriggerAction] = Field(
        default=[],
        title="Actions to perform when trigger is matched",
        description="List of actions to execute when trigger matches (notification, sub_label, attribute).",
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class CameraSemanticSearchConfig(FrigateBaseModel):
    triggers: Dict[str, TriggerConfig] = Field(
        default={},
        title="Trigger actions on tracked objects that match existing thumbnails or descriptions",
        description="Actions and matching criteria for camera-specific semantic search triggers.",
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class FaceRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable face recognition",
        description="Enable or disable face recognition globally.",
    )
    model_size: str = Field(
        default="small",
        title="The size of the embeddings model used",
        description="Model size to use for face embeddings (small/large); larger may require GPU.",
    )
    unknown_score: float = Field(
        title="Minimum face distance score required to be marked as a potential match",
        description="Distance threshold below which a face is considered a potential match (lower = stricter).",
        default=0.8,
        gt=0.0,
        le=1.0,
    )
    detection_threshold: float = Field(
        default=0.7,
        title="Minimum face detection score required to be considered a face",
        description="Minimum detection confidence required to consider a face detection valid.",
        gt=0.0,
        le=1.0,
    )
    recognition_threshold: float = Field(
        default=0.9,
        title="Minimum face distance score required to be considered a match",
        description="Face embedding distance threshold to consider two faces a match.",
        gt=0.0,
        le=1.0,
    )
    min_area: int = Field(
        default=750,
        title="Min area of face box to consider running face recognition",
        description="Minimum area (pixels) of a detected face box required to attempt recognition.",
    )
    min_faces: int = Field(
        default=1,
        gt=0,
        le=6,
        title="Min face recognitions for the sub label to be applied to the person object",
        description="Minimum number of face recognitions required before applying a recognized sub-label to a person.",
    )
    save_attempts: int = Field(
        default=200,
        ge=0,
        title="Number of face attempts to save in the recent recognitions tab",
        description="Number of face recognition attempts to retain for recent recognition UI.",
    )
    blur_confidence_filter: bool = Field(
        default=True,
        title="Apply blur quality filter to face confidence",
        description="Adjust confidence scores based on image blur to reduce false positives for poor quality faces.",
    )
    device: Optional[str] = Field(
        default=None,
        title="The device key to use for face recognition",
        description="This is an override, to target a specific device. See https://onnxruntime.ai/docs/execution-providers/ for more information",
    )


class CameraFaceRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable face recognition",
        description="Enable or disable face recognition globally.",
    )
    min_area: int = Field(
        default=750,
        title="Min area of face box to consider running face recognition",
        description="Minimum area (pixels) of a detected face box required to attempt recognition.",
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class ReplaceRule(FrigateBaseModel):
    pattern: str = Field(..., title="Regex pattern to match.")
    replacement: str = Field(
        ..., title="Replacement string (supports backrefs like '\\1')."
    )


class LicensePlateRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable license plate recognition",
        description="Enable or disable LPR globally; camera-level settings can override.",
    )
    model_size: str = Field(
        default="small",
        title="The size of the embeddings model used",
        description="Model size used for text detection/recognition; small runs on CPU, large on GPU.",
    )
    detection_threshold: float = Field(
        default=0.7,
        title="License plate object confidence score required to begin running recognition",
        description="Detection confidence threshold to begin running OCR on a suspected plate.",
        gt=0.0,
        le=1.0,
    )
    min_area: int = Field(
        default=1000,
        title="Minimum area of license plate to begin running recognition",
        description="Minimum plate area (pixels) required to attempt recognition.",
    )
    recognition_threshold: float = Field(
        default=0.9,
        title="Recognition confidence score required to add the plate to the object as a sub label",
        description="Confidence threshold required for recognized plate text to be attached as a sub-label.",
        gt=0.0,
        le=1.0,
    )
    min_plate_length: int = Field(
        default=4,
        title="Minimum number of characters a license plate must have to be added to the object as a sub label",
        description="Minimum number of characters a recognized plate must contain to be considered valid.",
    )
    format: Optional[str] = Field(
        default=None,
        title="Regular expression for the expected format of license plate",
        description="Optional regex to validate recognized plate strings against an expected format.",
    )
    match_distance: int = Field(
        default=1,
        title="Allow this number of missing/incorrect characters to still cause a detected plate to match a known plate",
        description="Number of character mismatches allowed when comparing detected plates to known plates.",
        ge=0,
    )
    known_plates: Optional[Dict[str, List[str]]] = Field(
        default={},
        title="Known plates to track (strings or regular expressions)",
        description="List of plates or regexes to specially track or alert on.",
    )
    enhancement: int = Field(
        default=0,
        title="Amount of contrast adjustment and denoising to apply to license plate images before recognition",
        description="Enhancement level (0-10) to apply to plate crops prior to OCR; higher values may not always improve results.",
        ge=0,
        le=10,
    )
    debug_save_plates: bool = Field(
        default=False,
        title="Save plates captured for LPR for debugging purposes",
        description="Save plate crop images for debugging LPR performance.",
    )
    device: Optional[str] = Field(
        default=None,
        title="The device key to use for LPR",
        description="This is an override, to target a specific device. See https://onnxruntime.ai/docs/execution-providers/ for more information",
    )
    replace_rules: List[ReplaceRule] = Field(
        default_factory=list,
        title="List of regex replacement rules for normalizing detected plates. Each rule has 'pattern' and 'replacement'",
        description="Regex replacement rules used to normalize detected plate strings before matching.",
    )


class CameraLicensePlateRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable license plate recognition",
        description="Enable or disable LPR globally; camera-level settings can override.",
    )
    expire_time: int = Field(
        default=3,
        title="Expire plates not seen after number of seconds (for dedicated LPR cameras only)",
        description="Time in seconds after which an unseen plate is expired from the tracker (for dedicated LPR cameras only).",
        gt=0,
    )
    min_area: int = Field(
        default=1000,
        title="Minimum area of license plate to begin running recognition",
        description="Minimum plate area (pixels) required to attempt recognition.",
    )
    enhancement: int = Field(
        default=0,
        title="Amount of contrast adjustment and denoising to apply to license plate images before recognition",
        description="Enhancement level (0-10) to apply to plate crops prior to OCR; higher values may not always improve results.",
        ge=0,
        le=10,
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class CameraAudioTranscriptionConfig(FrigateBaseModel):
    enabled: bool = Field(
        default=False,
        title="Enable audio transcription",
        description="Enable or disable automatic audio transcription.",
    )
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of audio transcription."
    )
    live_enabled: Optional[bool] = Field(
        default=False,
        title="Enable live transcriptions",
        description="Enable streaming live transcription for audio as it is received.",
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())
