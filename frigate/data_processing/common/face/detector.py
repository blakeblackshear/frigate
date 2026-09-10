"""Handle face detection."""

import logging
import os
from collections.abc import Callable
from dataclasses import dataclass

import cv2
import numpy as np

from frigate.const import MODEL_CACHE_DIR
from frigate.util.image import area

logger = logging.getLogger(__name__)

MAX_DETECTION_HEIGHT = 1080

FACE_DET_DIR = os.path.join(MODEL_CACHE_DIR, "facedet")


@dataclass
class DetectionResult:
    """A face detected by the face detector."""

    # (x1, y1, x2, y2)
    face: tuple[int, int, int, int]

    # eyes, nose tip, and mouth corners as (x, y) pairs, each pair ordered left
    # to right in image coordinates to match the arcface template. kept as
    # floats for sub pixel alignment accuracy
    landmarks: tuple[tuple[float, float], ...]


class FaceDetector:
    """Face detection runner."""

    def __init__(self, on_ready: Callable[[], None] | None = None) -> None:
        self.detector: cv2.FaceDetectorYN | None = None
        self.on_ready = on_ready

        GITHUB_ENDPOINT = os.environ.get("GITHUB_ENDPOINT", "https://github.com")

        self.model_files = {
            "facedet.onnx": f"{GITHUB_ENDPOINT}/NickM-27/facenet-onnx/releases/download/v1.0/facedet.onnx",
            "landmarkdet.yaml": f"{GITHUB_ENDPOINT}/NickM-27/facenet-onnx/releases/download/v1.0/landmarkdet.yaml",
        }

        if not all(
            os.path.exists(os.path.join(FACE_DET_DIR, n))
            for n in self.model_files.keys()
        ):
            # conditionally import ModelDownloader
            from frigate.util.downloader import ModelDownloader

            self.downloader = ModelDownloader(
                model_name="facedet",
                download_path=FACE_DET_DIR,
                file_names=list(self.model_files.keys()),
                download_func=self.__download_models,
                complete_func=self.__build_detector,
            )
            self.downloader.ensure_model_files()
        else:
            self.__build_detector()

    def __download_models(self, path: str) -> None:
        try:
            file_name = os.path.basename(path)
            # conditionally import ModelDownloader
            from frigate.util.downloader import ModelDownloader

            ModelDownloader.download_from_url(self.model_files[file_name], path)
        except Exception as e:
            logger.error(f"Failed to download {path}: {e}")

    def __build_detector(self) -> None:
        self.detector = cv2.FaceDetectorYN.create(
            os.path.join(FACE_DET_DIR, "facedet.onnx"),
            config="",
            input_size=(320, 320),
            score_threshold=0.5,
            nms_threshold=0.3,
        )

        if self.on_ready is not None:
            self.on_ready()

    def detect(self, input: np.ndarray, threshold: float) -> DetectionResult | None:
        """Detect the largest face in the input image.

        Args:
            input: The image to run detection on
            threshold: Minimum detection confidence to accept a face

        Returns:
            The largest detected face with its landmarks, or None
        """
        if not self.detector:
            return None

        height, width = input.shape[:2]

        # YN face detector fails at extreme definitions
        # this rescales to a size that can properly detect faces
        # still retaining plenty of detail
        if height > MAX_DETECTION_HEIGHT:
            scale_factor = MAX_DETECTION_HEIGHT / height
            new_width = int(scale_factor * width)
            input = cv2.resize(input, (new_width, MAX_DETECTION_HEIGHT))
        else:
            scale_factor = 1

        self.detector.setInputSize((input.shape[1], input.shape[0]))
        faces = self.detector.detect(input)

        if faces is None or faces[1] is None:
            return None  # type: ignore[unreachable]

        best: DetectionResult | None = None
        best_area = 0

        for potential_face in faces[1]:
            if potential_face[-1] < threshold:
                continue

            # YuNet reports floats outside of the image for cut off faces, the
            # far edges are derived before clamping so they don't move with the
            # clamped near edges
            raw_x = float(potential_face[0]) / scale_factor
            raw_y = float(potential_face[1]) / scale_factor
            bbox = (
                max(int(raw_x), 0),
                max(int(raw_y), 0),
                min(int(raw_x + float(potential_face[2]) / scale_factor), width),
                min(int(raw_y + float(potential_face[3]) / scale_factor), height),
            )
            bbox_area = area(bbox)

            if bbox_area <= best_area:
                continue

            # landmarks are left unclamped for a more accurate alignment fit
            best = DetectionResult(
                face=bbox,
                landmarks=tuple(
                    (float(x) / scale_factor, float(y) / scale_factor)
                    for x, y in potential_face[4:14].reshape(5, 2)
                ),
            )
            best_area = bbox_area

        return best
