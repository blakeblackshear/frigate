import logging
import os
import queue
import threading
from abc import ABC, abstractmethod

import cv2
import numpy as np
from scipy import stats

from frigate.config import FrigateConfig
from frigate.const import FACE_DIR, MODEL_CACHE_DIR
from frigate.embeddings.onnx.face_embedding import ArcfaceEmbedding, FaceNetEmbedding
from frigate.log import redirect_output_to_logger

logger = logging.getLogger(__name__)


class FaceRecognizer(ABC):
    """Face recognition runner."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config = config
        self.landmark_detector: cv2.face.FacemarkLBF = None
        self.init_landmark_detector()

    @abstractmethod
    def build(self) -> None:
        """Build face recognition model."""
        pass

    @abstractmethod
    def clear(self) -> None:
        """Clear current built model."""
        pass

    @abstractmethod
    def classify(self, face_image: np.ndarray) -> tuple[str, float] | None:
        pass

    @redirect_output_to_logger(logger, logging.DEBUG)
    def init_landmark_detector(self) -> None:
        landmark_model = os.path.join(MODEL_CACHE_DIR, "facedet/landmarkdet.yaml")

        if os.path.exists(landmark_model):
            self.landmark_detector = cv2.face.createFacemarkLBF()
            self.landmark_detector.loadModel(landmark_model)

    def align_face(
        self,
        image: np.ndarray,
        output_width: int,
        output_height: int,
    ) -> np.ndarray:
        # landmark is run on grayscale images

        if image.ndim == 3:
            land_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            land_image = image

        _, lands = self.landmark_detector.fit(
            land_image, np.array([(0, 0, land_image.shape[1], land_image.shape[0])])
        )
        landmarks: np.ndarray = lands[0][0]

        # get landmarks for eyes
        leftEyePts = landmarks[42:48]
        rightEyePts = landmarks[36:42]

        # compute the center of mass for each eye
        leftEyeCenter = leftEyePts.mean(axis=0).astype("int")
        rightEyeCenter = rightEyePts.mean(axis=0).astype("int")

        # compute the angle between the eye centroids
        dY = rightEyeCenter[1] - leftEyeCenter[1]
        dX = rightEyeCenter[0] - leftEyeCenter[0]
        angle = np.degrees(np.arctan2(dY, dX)) - 180

        # compute the desired right eye x-coordinate based on the
        # desired x-coordinate of the left eye
        desiredRightEyeX = 1.0 - 0.35

        # determine the scale of the new resulting image by taking
        # the ratio of the distance between eyes in the *current*
        # image to the ratio of distance between eyes in the
        # *desired* image
        dist = np.sqrt((dX**2) + (dY**2))
        desiredDist = desiredRightEyeX - 0.35
        desiredDist *= output_width
        scale = desiredDist / dist

        # compute center (x, y)-coordinates (i.e., the median point)
        # between the two eyes in the input image
        # grab the rotation matrix for rotating and scaling the face
        eyesCenter = (
            int((leftEyeCenter[0] + rightEyeCenter[0]) // 2),
            int((leftEyeCenter[1] + rightEyeCenter[1]) // 2),
        )
        M = cv2.getRotationMatrix2D(eyesCenter, angle, scale)

        # update the translation component of the matrix
        tX = output_width * 0.5
        tY = output_height * 0.35
        M[0, 2] += tX - eyesCenter[0]
        M[1, 2] += tY - eyesCenter[1]

        # apply the affine transformation
        return cv2.warpAffine(
            image, M, (output_width, output_height), flags=cv2.INTER_CUBIC
        )

    def get_blur_confidence_reduction(self, input: np.ndarray) -> float:
        """Calculates the reduction in confidence based on the blur of the image."""
        if not self.config.face_recognition.blur_confidence_filter:
            return 0.0

        variance = cv2.Laplacian(input, cv2.CV_64F).var()
        logger.debug(f"face detected with blurriness {variance}")

        if variance < 120:  # image is very blurry
            return 0.06
        elif variance < 160:  # image moderately blurry
            return 0.04
        elif variance < 200:  # image is slightly blurry
            return 0.02
        elif variance < 250:  # image is mostly clear
            return 0.01
        else:
            return 0.0


def similarity_to_confidence(
    cosine_similarity: float, median=0.3, range_width=0.6, slope_factor=12
):
    """
    Default sigmoid function to map cosine similarity to confidence.

    Args:
        cosine_similarity (float): The input cosine similarity.
        median (float): Assumed median of cosine similarity distribution.
        range_width (float): Assumed range of cosine similarity distribution (90th percentile - 10th percentile).
        slope_factor (float): Adjusts the steepness of the curve.

    Returns:
        float: The confidence score.
    """

    # Calculate slope and bias
    slope = slope_factor / range_width
    bias = median

    # Calculate confidence
    confidence = 1 / (1 + np.exp(-slope * (cosine_similarity - bias)))
    return confidence


class FaceNetRecognizer(FaceRecognizer):
    def __init__(self, config: FrigateConfig):
        super().__init__(config)
        self.mean_embs: dict[int, np.ndarray] = {}
        self.face_embedder: FaceNetEmbedding = FaceNetEmbedding()
        self.model_builder_queue: queue.Queue | None = None

    def clear(self) -> None:
        self.mean_embs = {}

    def run_build_task(self) -> None:
        self.model_builder_queue = queue.Queue()

        def build_model():
            face_embeddings_map: dict[str, list[np.ndarray]] = {}
            idx = 0

            dir = FACE_DIR
            for name in os.listdir(dir):
                if name == "train":
                    continue

                face_folder = os.path.join(dir, name)

                if not os.path.isdir(face_folder):
                    continue

                face_embeddings_map[name] = []
                for image in os.listdir(face_folder):
                    img = cv2.imread(os.path.join(face_folder, image))

                    if img is None:
                        continue

                    img = self.align_face(img, img.shape[1], img.shape[0])
                    emb = self.face_embedder([img])[0].squeeze()
                    face_embeddings_map[name].append(emb)

                idx += 1

            self.model_builder_queue.put(face_embeddings_map)

        thread = threading.Thread(target=build_model, daemon=True)
        thread.start()

    def build(self):
        if not self.landmark_detector:
            self.init_landmark_detector()
            return None

        if self.model_builder_queue is not None:
            try:
                face_embeddings_map: dict[str, list[np.ndarray]] = (
                    self.model_builder_queue.get(timeout=0.1)
                )
                self.model_builder_queue = None
            except queue.Empty:
                return
        else:
            self.run_build_task()
            return

        if not face_embeddings_map:
            return

        for name, embs in face_embeddings_map.items():
            if embs:
                self.mean_embs[name] = stats.trim_mean(embs, 0.15)

        logger.debug("Finished building ArcFace model")

    def classify(self, face_image):
        if not self.landmark_detector:
            return None

        if not self.mean_embs:
            self.build()

            if not self.mean_embs:
                return None

        # face recognition is best run on grayscale images

        # get blur factor before aligning face
        blur_reduction = self.get_blur_confidence_reduction(face_image)

        # align face and run recognition
        img = self.align_face(face_image, face_image.shape[1], face_image.shape[0])
        embedding = self.face_embedder([img])[0].squeeze()

        score = 0
        label = ""

        for name, mean_emb in self.mean_embs.items():
            dot_product = np.dot(embedding, mean_emb)
            magnitude_A = np.linalg.norm(embedding)
            magnitude_B = np.linalg.norm(mean_emb)

            cosine_similarity = dot_product / (magnitude_A * magnitude_B)
            confidence = similarity_to_confidence(
                cosine_similarity, median=0.5, range_width=0.6
            )

            if confidence > score:
                score = confidence
                label = name

        return label, max(0, round(score - blur_reduction, 2))


class ArcFaceRecognizer(FaceRecognizer):
    def __init__(self, config: FrigateConfig):
        super().__init__(config)
        self.mean_embs: dict[int, np.ndarray] = {}
        self.face_embedder: ArcfaceEmbedding = ArcfaceEmbedding(config.face_recognition)
        self.model_builder_queue: queue.Queue | None = None

    def clear(self) -> None:
        self.mean_embs = {}

    def run_build_task(self) -> None:
        self.model_builder_queue = queue.Queue()

        def build_model():
            face_embeddings_map: dict[str, list[np.ndarray]] = {}
            idx = 0

            dir = FACE_DIR
            for name in os.listdir(dir):
                if name == "train":
                    continue

                face_folder = os.path.join(dir, name)

                if not os.path.isdir(face_folder):
                    continue

                face_embeddings_map[name] = []
                for image in os.listdir(face_folder):
                    img = cv2.imread(os.path.join(face_folder, image))

                    if img is None:
                        continue

                    img = self.align_face(img, img.shape[1], img.shape[0])
                    emb = self.face_embedder([img])[0].squeeze()
                    face_embeddings_map[name].append(emb)

                idx += 1

            self.model_builder_queue.put(face_embeddings_map)

        thread = threading.Thread(target=build_model, daemon=True)
        thread.start()

    def build(self):
        if not self.landmark_detector:
            self.init_landmark_detector()
            return None

        if self.model_builder_queue is not None:
            try:
                face_embeddings_map: dict[str, list[np.ndarray]] = (
                    self.model_builder_queue.get(timeout=0.1)
                )
                self.model_builder_queue = None
            except queue.Empty:
                return
        else:
            self.run_build_task()
            return

        if not face_embeddings_map:
            return

        for name, embs in face_embeddings_map.items():
            if embs:
                self.mean_embs[name] = stats.trim_mean(embs, 0.15)

        logger.debug("Finished building ArcFace model")

    def classify(self, face_image):
        if not self.landmark_detector:
            return None

        if not self.mean_embs:
            self.build()

            if not self.mean_embs:
                return None

        # face recognition is best run on grayscale images

        # get blur reduction before aligning face
        blur_reduction = self.get_blur_confidence_reduction(face_image)

        # align face and run recognition
        img = self.align_face(face_image, face_image.shape[1], face_image.shape[0])
        embedding = self.face_embedder([img])[0].squeeze()

        score = 0
        label = ""

        for name, mean_emb in self.mean_embs.items():
            dot_product = np.dot(embedding, mean_emb)
            magnitude_A = np.linalg.norm(embedding)
            magnitude_B = np.linalg.norm(mean_emb)

            cosine_similarity = dot_product / (magnitude_A * magnitude_B)
            confidence = similarity_to_confidence(cosine_similarity)

            if confidence > score:
                score = confidence
                label = name

        return label, max(0, round(score - blur_reduction, 2))
