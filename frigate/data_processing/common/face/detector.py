"""Handle face detection."""

import logging
import os
import threading
from collections.abc import Callable
from dataclasses import dataclass

import cv2
import numpy as np

from frigate.const import MODEL_CACHE_DIR
from frigate.log import redirect_output_to_logger
from frigate.util.image import area

logger = logging.getLogger(__name__)

MAX_DETECTION_HEIGHT = 1080

FACE_DET_DIR = os.path.join(MODEL_CACHE_DIR, "facedet")

# 5 point template the arcface models are trained on, defined against a 112x112
# crop and scaled to whatever size the embedding model takes
FACE_TEMPLATE_SIZE = 112
FACE_TEMPLATE = np.array(
    [
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
        [41.5493, 92.3655],
        [70.7299, 92.2041],
    ],
    dtype=np.float32,
)


# landmarks further than this from a plausible face shape are not trusted. on a
# sample of camera face crops every set that failed a basic eye, nose, and mouth
# ordering check scored above 9.5 and every set that passed scored below 9.2
MAX_LANDMARK_FIT_ERROR = 9.0


def landmark_fit_error(landmarks: tuple[tuple[float, float], ...]) -> float:
    """Mean distance in template pixels once landmarks are fit to the template.

    Scale, rotation, and position are fit out, so this measures only how far
    the landmarks are from a plausible face shape.
    """
    src = np.array(landmarks, dtype=np.float32)
    matrix, _ = cv2.estimateAffinePartial2D(src, FACE_TEMPLATE, method=cv2.LMEDS)

    if matrix is None:
        return float("inf")  # type: ignore[unreachable]

    fit = src @ matrix[:, :2].T + matrix[:, 2]
    return float(np.linalg.norm(fit - FACE_TEMPLATE, axis=1).mean())


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
        self.landmark_detector: cv2.face.Facemark | None = None
        self.on_ready = on_ready

        # both models hold internal state across a call, and the recognizer
        # builds its class means on a background thread while frames are
        # still being processed, so calls into them are serialized
        self.lock = threading.Lock()

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
        self.__init_landmark_detector()

        if self.on_ready is not None:
            self.on_ready()

    @property
    def is_ready(self) -> bool:
        """Whether both the detection and landmark models are loaded."""
        return self.detector is not None and self.landmark_detector is not None

    @redirect_output_to_logger(logger, logging.DEBUG)
    def __init_landmark_detector(self) -> None:
        landmark_model = os.path.join(FACE_DET_DIR, "landmarkdet.yaml")

        if os.path.exists(landmark_model):
            landmark_detector = cv2.face.createFacemarkLBF()
            landmark_detector.loadModel(landmark_model)
            self.landmark_detector = landmark_detector

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

        with self.lock:
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

    def get_face_landmarks(
        self, input: np.ndarray, threshold: float = 0.5
    ) -> tuple[tuple[float, float], ...] | None:
        """Get the alignment landmarks for an image that is already a face crop.

        Args:
            input: The face crop to get landmarks for
            threshold: Minimum detection confidence to accept a face

        Returns:
            Eye, nose, and mouth landmarks, or None
        """
        detection = self.detect(input, threshold)

        if (
            detection is not None
            and landmark_fit_error(detection.landmarks) <= MAX_LANDMARK_FIT_ERROR
        ):
            return detection.landmarks

        # detection either failed, which is common on a crop that is already
        # tight around the face, or returned landmarks that are not shaped like
        # a face, so the landmark model is given the whole crop as the face
        landmarks = self.__fit_landmarks(input)

        if landmarks is None or landmark_fit_error(landmarks) > MAX_LANDMARK_FIT_ERROR:
            return None

        return landmarks

    def __fit_landmarks(
        self, input: np.ndarray
    ) -> tuple[tuple[float, float], ...] | None:
        """Derive the 5 alignment landmarks from the 68 point landmark model."""
        if self.landmark_detector is None:
            return None

        # the landmark model runs on grayscale
        gray = cv2.cvtColor(input, cv2.COLOR_BGR2GRAY) if input.ndim == 3 else input

        try:
            with self.lock:
                success, faces = self.landmark_detector.fit(
                    gray, np.array([(0, 0, gray.shape[1], gray.shape[0])])
                )
        except cv2.error:
            logger.debug("Failed to fit landmarks")
            return None

        if not success or not len(faces):
            return None

        points = faces[0][0]

        # each eye is the mean of the 6 points around it
        return tuple(
            (float(p[0]), float(p[1]))
            for p in (
                points[36:42].mean(axis=0),
                points[42:48].mean(axis=0),
                points[30],
                points[48],
                points[54],
            )
        )
