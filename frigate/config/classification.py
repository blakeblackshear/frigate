from enum import Enum
from typing import Dict, List, Optional

from pydantic import ConfigDict, Field

from frigate.types import ObjectClassificationType

from .base import FrigateBaseModel

__all__ = [
    "CameraFaceRecognitionConfig",
    "CameraLicensePlateRecognitionConfig",
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


class AudioTranscriptionConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable audio transcription.")
    language: str = Field(
        default="en",
        title="Language abbreviation to use for audio event transcription/translation.",
    )
    device: Optional[EnrichmentsDeviceEnum] = Field(
        default=EnrichmentsDeviceEnum.CPU,
        title="The device used for license plate recognition.",
    )
    model_size: str = Field(
        default="small", title="The size of the embeddings model used."
    )
    enabled_in_config: Optional[bool] = Field(
        default=None, title="Keep track of original state of camera."
    )
    live_enabled: Optional[bool] = Field(
        default=False, title="Enable live transcriptions."
    )


class BirdClassificationConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable bird classification.")
    threshold: float = Field(
        default=0.9,
        title="Minimum classification score required to be considered a match.",
        gt=0.0,
        le=1.0,
    )


class CustomClassificationStateCameraConfig(FrigateBaseModel):
    crop: list[int, int, int, int] = Field(
        title="Crop of image frame on this camera to run classification on."
    )


class CustomClassificationStateConfig(FrigateBaseModel):
    cameras: Dict[str, CustomClassificationStateCameraConfig] = Field(
        title="Cameras to run classification on."
    )
    motion: bool = Field(
        default=False,
        title="If classification should be run when motion is detected in the crop.",
    )
    interval: int | None = Field(
        default=None,
        title="Interval to run classification on in seconds.",
        gt=0,
    )


class CustomClassificationObjectConfig(FrigateBaseModel):
    objects: list[str] = Field(title="Object types to classify.")
    classification_type: ObjectClassificationType = Field(
        default=ObjectClassificationType.sub_label,
        title="Type of classification that is applied.",
    )


class CustomClassificationConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="Enable running the model.")
    name: str | None = Field(default=None, title="Name of classification model.")
    threshold: float = Field(
        default=0.8, title="Classification score threshold to change the state."
    )
    object_config: CustomClassificationObjectConfig | None = Field(default=None)
    state_config: CustomClassificationStateConfig | None = Field(default=None)


class ClassificationConfig(FrigateBaseModel):
    bird: BirdClassificationConfig = Field(
        default_factory=BirdClassificationConfig, title="Bird classification config."
    )
    custom: Dict[str, CustomClassificationConfig] = Field(
        default={}, title="Custom Classification Model Configs."
    )


class SemanticSearchConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable semantic search.")
    reindex: Optional[bool] = Field(
        default=False, title="Reindex all tracked objects on startup."
    )
    model: Optional[SemanticSearchModelEnum] = Field(
        default=SemanticSearchModelEnum.jinav1,
        title="The CLIP model to use for semantic search.",
    )
    model_size: str = Field(
        default="small", title="The size of the embeddings model used."
    )


class TriggerConfig(FrigateBaseModel):
    enabled: bool = Field(default=True, title="Enable this trigger")
    type: TriggerType = Field(default=TriggerType.DESCRIPTION, title="Type of trigger")
    data: str = Field(title="Trigger content (text phrase or image ID)")
    threshold: float = Field(
        title="Confidence score required to run the trigger",
        default=0.8,
        gt=0.0,
        le=1.0,
    )
    actions: Optional[List[TriggerAction]] = Field(
        default=[], title="Actions to perform when trigger is matched"
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class CameraSemanticSearchConfig(FrigateBaseModel):
    triggers: Optional[Dict[str, TriggerConfig]] = Field(
        default=None,
        title="Trigger actions on tracked objects that match existing thumbnails or descriptions",
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class FaceRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable face recognition.")
    model_size: str = Field(
        default="small", title="The size of the embeddings model used."
    )
    unknown_score: float = Field(
        title="Minimum face distance score required to be marked as a potential match.",
        default=0.8,
        gt=0.0,
        le=1.0,
    )
    detection_threshold: float = Field(
        default=0.7,
        title="Minimum face detection score required to be considered a face.",
        gt=0.0,
        le=1.0,
    )
    recognition_threshold: float = Field(
        default=0.9,
        title="Minimum face distance score required to be considered a match.",
        gt=0.0,
        le=1.0,
    )
    min_area: int = Field(
        default=750, title="Min area of face box to consider running face recognition."
    )
    min_faces: int = Field(
        default=1,
        gt=0,
        le=6,
        title="Min face attempts for the sub label to be applied to the person object.",
    )
    save_attempts: int = Field(
        default=100, ge=0, title="Number of face attempts to save in the train tab."
    )
    blur_confidence_filter: bool = Field(
        default=True, title="Apply blur quality filter to face confidence."
    )


class CameraFaceRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable face recognition.")
    min_area: int = Field(
        default=750, title="Min area of face box to consider running face recognition."
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())


class LicensePlateRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable license plate recognition.")
    device: Optional[EnrichmentsDeviceEnum] = Field(
        default=EnrichmentsDeviceEnum.CPU,
        title="The device used for license plate recognition.",
    )
    model_size: str = Field(
        default="small", title="The size of the embeddings model used."
    )
    detection_threshold: float = Field(
        default=0.7,
        title="License plate object confidence score required to begin running recognition.",
        gt=0.0,
        le=1.0,
    )
    min_area: int = Field(
        default=1000,
        title="Minimum area of license plate to begin running recognition.",
    )
    recognition_threshold: float = Field(
        default=0.9,
        title="Recognition confidence score required to add the plate to the object as a sub label.",
        gt=0.0,
        le=1.0,
    )
    min_plate_length: int = Field(
        default=4,
        title="Minimum number of characters a license plate must have to be added to the object as a sub label.",
    )
    format: Optional[str] = Field(
        default=None,
        title="Regular expression for the expected format of license plate.",
    )
    match_distance: int = Field(
        default=1,
        title="Allow this number of missing/incorrect characters to still cause a detected plate to match a known plate.",
        ge=0,
    )
    known_plates: Optional[Dict[str, List[str]]] = Field(
        default={}, title="Known plates to track (strings or regular expressions)."
    )
    enhancement: int = Field(
        default=0,
        title="Amount of contrast adjustment and denoising to apply to license plate images before recognition.",
        ge=0,
        le=10,
    )
    debug_save_plates: bool = Field(
        default=False,
        title="Save plates captured for LPR for debugging purposes.",
    )


class CameraLicensePlateRecognitionConfig(FrigateBaseModel):
    enabled: bool = Field(default=False, title="Enable license plate recognition.")
    expire_time: int = Field(
        default=3,
        title="Expire plates not seen after number of seconds (for dedicated LPR cameras only).",
        gt=0,
    )
    min_area: int = Field(
        default=1000,
        title="Minimum area of license plate to begin running recognition.",
    )
    enhancement: int = Field(
        default=0,
        title="Amount of contrast adjustment and denoising to apply to license plate images before recognition.",
        ge=0,
        le=10,
    )

    model_config = ConfigDict(extra="forbid", protected_namespaces=())
