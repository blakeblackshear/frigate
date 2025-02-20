from frigate.embeddings.onnx.lpr_embedding import (
    LicensePlateDetector,
    PaddleOCRClassification,
    PaddleOCRDetection,
    PaddleOCRRecognition,
)

from ...types import DataProcessorModelRunner


class LicensePlateModelRunner(DataProcessorModelRunner):
    def __init__(self, requestor, device: str = "CPU", model_size: str = "large"):
        super().__init__(requestor, device, model_size)
        self.detection_model = PaddleOCRDetection(
            model_size=model_size, requestor=requestor, device=device
        )
        self.classification_model = PaddleOCRClassification(
            model_size=model_size, requestor=requestor, device=device
        )
        self.recognition_model = PaddleOCRRecognition(
            model_size=model_size, requestor=requestor, device=device
        )
        self.yolov9_detection_model = LicensePlateDetector(
            model_size=model_size, requestor=requestor, device=device
        )

        # Load all models once
        self.detection_model._load_model_and_utils()
        self.classification_model._load_model_and_utils()
        self.recognition_model._load_model_and_utils()
        self.yolov9_detection_model._load_model_and_utils()
