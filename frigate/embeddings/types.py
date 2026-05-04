from enum import Enum


class EmbeddingTypeEnum(str, Enum):
    thumbnail = "thumbnail"
    description = "description"


class EnrichmentModelTypeEnum(str, Enum):
    # When adding a value, audit every classifier that switches on it:
    #   - ONNXModelRunner.has_variable_length_inputs
    #   - ONNXModelRunner.is_cpu_complex_model
    #   - ONNXModelRunner.is_migraphx_complex_model
    #   - ONNXModelRunner.is_concurrent_model
    #   - CudaGraphRunner.is_model_supported
    # The default for omission is "fixed-size, simple, single-threaded" - which
    # silently re-introduces the ORT mem-pattern leak if the new model is
    # actually variable-length (Jina/PaddleOCR-class).
    # TODO: replace these scattered include-lists with a single MODEL_TRAITS
    # registry co-located with the enum so adding a value forces classification.
    arcface = "arcface"
    facenet = "facenet"
    jina_v1 = "jina_v1"
    jina_v2 = "jina_v2"
    paddleocr = "paddleocr"
    yolov9_license_plate = "yolov9_license_plate"
