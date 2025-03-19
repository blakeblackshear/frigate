"""Handle processing images for face detection and recognition."""

import base64
import datetime
import logging
import os
import random
import shutil
import string
from typing import Optional

import cv2
import numpy as np

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum
from frigate.comms.event_metadata_updater import (
    EventMetadataPublisher,
    EventMetadataTypeEnum,
)
from frigate.config import FrigateConfig
from frigate.const import FACE_DIR, MODEL_CACHE_DIR
from frigate.util.image import area

from ..types import DataProcessorMetrics
from .api import RealTimeProcessorApi

logger = logging.getLogger(__name__)


MAX_DETECTION_HEIGHT = 1080
MIN_MATCHING_FACES = 2


class FaceRealTimeProcessor(RealTimeProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        sub_label_publisher: EventMetadataPublisher,
        metrics: DataProcessorMetrics,
    ):
        super().__init__(config, metrics)
        self.face_config = config.face_recognition
        self.sub_label_publisher = sub_label_publisher
        self.face_detector: cv2.FaceDetectorYN = None
        self.landmark_detector: cv2.face.FacemarkLBF = None
        self.recognizer: cv2.face.LBPHFaceRecognizer = None
        self.requires_face_detection = "face" not in self.config.objects.all_objects
        self.detected_faces: dict[str, float] = {}

        download_path = os.path.join(MODEL_CACHE_DIR, "facedet")
        self.model_files = {
            "facedet.onnx": "https://github.com/NickM-27/facenet-onnx/releases/download/v1.0/facedet.onnx",
            "landmarkdet.yaml": "https://github.com/NickM-27/facenet-onnx/releases/download/v1.0/landmarkdet.yaml",
        }

        if not all(
            os.path.exists(os.path.join(download_path, n))
            for n in self.model_files.keys()
        ):
            # conditionally import ModelDownloader
            from frigate.util.downloader import ModelDownloader

            self.downloader = ModelDownloader(
                model_name="facedet",
                download_path=download_path,
                file_names=self.model_files.keys(),
                download_func=self.__download_models,
                complete_func=self.__build_detector,
            )
            self.downloader.ensure_model_files()
        else:
            self.__build_detector()

        self.label_map: dict[int, str] = {}
        self.__build_classifier()

    def __download_models(self, path: str) -> None:
        try:
            file_name = os.path.basename(path)
            # conditionally import ModelDownloader
            from frigate.util.downloader import ModelDownloader

            ModelDownloader.download_from_url(self.model_files[file_name], path)
        except Exception as e:
            logger.error(f"Failed to download {path}: {e}")

    def __build_detector(self) -> None:
        self.face_detector = cv2.FaceDetectorYN.create(
            os.path.join(MODEL_CACHE_DIR, "facedet/facedet.onnx"),
            config="",
            input_size=(320, 320),
            score_threshold=0.5,
            nms_threshold=0.3,
        )
        self.landmark_detector = cv2.face.createFacemarkLBF()
        self.landmark_detector.loadModel(
            os.path.join(MODEL_CACHE_DIR, "facedet/landmarkdet.yaml")
        )

    def __build_classifier(self) -> None:
        if not self.landmark_detector:
            return None

        labels = []
        faces = []

        dir = "/media/frigate/clips/faces"
        for idx, name in enumerate(os.listdir(dir)):
            if name == "train":
                continue

            face_folder = os.path.join(dir, name)

            if not os.path.isdir(face_folder):
                continue

            self.label_map[idx] = name
            for image in os.listdir(face_folder):
                img = cv2.imread(os.path.join(face_folder, image))

                if img is None:
                    continue

                img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                img = self.__align_face(img, img.shape[1], img.shape[0])
                faces.append(img)
                labels.append(idx)

        if not faces:
            return

        self.recognizer: cv2.face.LBPHFaceRecognizer = (
            cv2.face.LBPHFaceRecognizer_create(
                radius=2, threshold=(1 - self.face_config.min_score) * 1000
            )
        )
        self.recognizer.train(faces, np.array(labels))

    def __align_face(
        self,
        image: np.ndarray,
        output_width: int,
        output_height: int,
    ) -> np.ndarray:
        _, lands = self.landmark_detector.fit(
            image, np.array([(0, 0, image.shape[1], image.shape[0])])
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

    def __get_blur_factor(self, input: np.ndarray) -> float:
        """Calculates the factor for the confidence based on the blur of the image."""
        if not self.face_config.blur_confidence_filter:
            return 1.0

        variance = cv2.Laplacian(input, cv2.CV_64F).var()

        if variance < 60:  # image is very blurry
            return 0.96
        elif variance < 70:  # image moderately blurry
            return 0.98
        elif variance < 80:  # image is slightly blurry
            return 0.99
        else:
            return 1.0

    def __clear_classifier(self) -> None:
        self.face_recognizer = None
        self.label_map = {}

    def __detect_face(
        self, input: np.ndarray, threshold: float
    ) -> tuple[int, int, int, int]:
        """Detect faces in input image."""
        if not self.face_detector:
            return None

        # YN face detector fails at extreme definitions
        # this rescales to a size that can properly detect faces
        # still retaining plenty of detail
        if input.shape[0] > MAX_DETECTION_HEIGHT:
            scale_factor = MAX_DETECTION_HEIGHT / input.shape[0]
            new_width = int(scale_factor * input.shape[1])
            input = cv2.resize(input, (new_width, MAX_DETECTION_HEIGHT))
        else:
            scale_factor = 1

        self.face_detector.setInputSize((input.shape[1], input.shape[0]))
        faces = self.face_detector.detect(input)

        if faces is None or faces[1] is None:
            return None

        face = None

        for _, potential_face in enumerate(faces[1]):
            if potential_face[-1] < threshold:
                continue

            raw_bbox = potential_face[0:4].astype(np.uint16)
            x: int = int(max(raw_bbox[0], 0) / scale_factor)
            y: int = int(max(raw_bbox[1], 0) / scale_factor)
            w: int = int(raw_bbox[2] / scale_factor)
            h: int = int(raw_bbox[3] / scale_factor)
            bbox = (x, y, x + w, y + h)

            if face is None or area(bbox) > area(face):
                face = bbox

        return face

    def __classify_face(self, face_image: np.ndarray) -> tuple[str, float] | None:
        if not self.landmark_detector:
            return None

        if not self.label_map or not self.recognizer:
            self.__build_classifier()

            if not self.recognizer:
                return None

        # face recognition is best run on grayscale images
        img = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)

        # get blur factor before aligning face
        blur_factor = self.__get_blur_factor(img)
        logger.debug(f"face detected with bluriness {blur_factor}")

        # align face and run recognition
        img = self.__align_face(img, img.shape[1], img.shape[0])
        index, distance = self.recognizer.predict(img)

        if index == -1:
            return None

        score = (1.0 - (distance / 1000)) * blur_factor
        return self.label_map[index], round(score, 2)

    def __update_metrics(self, duration: float) -> None:
        self.metrics.face_rec_fps.value = (
            self.metrics.face_rec_fps.value * 9 + duration
        ) / 10

    def process_frame(self, obj_data: dict[str, any], frame: np.ndarray):
        """Look for faces in image."""
        start = datetime.datetime.now().timestamp()
        id = obj_data["id"]

        # don't run for non person objects
        if obj_data.get("label") != "person":
            logger.debug("Not a processing face for non person object.")
            return

        # don't overwrite sub label for objects that have a sub label
        # that is not a face
        if obj_data.get("sub_label") and id not in self.detected_faces:
            logger.debug(
                f"Not processing face due to existing sub label: {obj_data.get('sub_label')}."
            )
            return

        face: Optional[dict[str, any]] = None

        if self.requires_face_detection:
            logger.debug("Running manual face detection.")
            person_box = obj_data.get("box")

            if not person_box:
                return

            rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2RGB_I420)
            left, top, right, bottom = person_box
            person = rgb[top:bottom, left:right]
            face_box = self.__detect_face(person, self.face_config.detection_threshold)

            if not face_box:
                logger.debug("Detected no faces for person object.")
                return

            face_frame = person[
                max(0, face_box[1]) : min(frame.shape[0], face_box[3]),
                max(0, face_box[0]) : min(frame.shape[1], face_box[2]),
            ]
            face_frame = cv2.cvtColor(face_frame, cv2.COLOR_RGB2BGR)
        else:
            # don't run for object without attributes
            if not obj_data.get("current_attributes"):
                logger.debug("No attributes to parse.")
                return

            attributes: list[dict[str, any]] = obj_data.get("current_attributes", [])
            for attr in attributes:
                if attr.get("label") != "face":
                    continue

                if face is None or attr.get("score", 0.0) > face.get("score", 0.0):
                    face = attr

            # no faces detected in this frame
            if not face:
                return

            face_box = face.get("box")

            # check that face is valid
            if not face_box or area(face_box) < self.config.face_recognition.min_area:
                logger.debug(f"Invalid face box {face}")
                return

            face_frame = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)

            face_frame = face_frame[
                max(0, face_box[1]) : min(frame.shape[0], face_box[3]),
                max(0, face_box[0]) : min(frame.shape[1], face_box[2]),
            ]

        res = self.__classify_face(face_frame)

        if not res:
            return

        sub_label, score = res

        # calculate the overall face score as the probability * area of face
        # this will help to reduce false positives from small side-angle faces
        # if a large front-on face image may have scored slightly lower but
        # is more likely to be accurate due to the larger face area
        face_score = round(score * face_frame.shape[0] * face_frame.shape[1], 2)

        logger.debug(
            f"Detected best face for person as: {sub_label} with probability {score} and overall face score {face_score}"
        )

        if self.config.face_recognition.save_attempts:
            # write face to library
            folder = os.path.join(FACE_DIR, "train")
            file = os.path.join(folder, f"{id}-{sub_label}-{score}-{face_score}.webp")
            os.makedirs(folder, exist_ok=True)
            cv2.imwrite(file, face_frame)

        if score < self.config.face_recognition.recognition_threshold:
            logger.debug(
                f"Recognized face distance {score} is less than threshold {self.config.face_recognition.recognition_threshold}"
            )
            self.__update_metrics(datetime.datetime.now().timestamp() - start)
            return

        if id in self.detected_faces and face_score <= self.detected_faces[id]:
            logger.debug(
                f"Recognized face distance {score} and overall score {face_score} is less than previous overall face score ({self.detected_faces.get(id)})."
            )
            self.__update_metrics(datetime.datetime.now().timestamp() - start)
            return

        self.sub_label_publisher.publish(
            EventMetadataTypeEnum.sub_label, (id, sub_label, score)
        )
        self.detected_faces[id] = face_score
        self.__update_metrics(datetime.datetime.now().timestamp() - start)

    def handle_request(self, topic, request_data) -> dict[str, any] | None:
        if topic == EmbeddingsRequestEnum.clear_face_classifier.value:
            self.__clear_classifier()
        elif topic == EmbeddingsRequestEnum.recognize_face.value:
            img = cv2.imdecode(
                np.frombuffer(base64.b64decode(request_data["image"]), dtype=np.uint8),
                cv2.IMREAD_COLOR,
            )

            # detect faces with lower confidence since we expect the face
            # to be visible in uploaded images
            face_box = self.__detect_face(img, 0.5)

            if not face_box:
                return {"message": "No face was detected.", "success": False}

            face = img[face_box[1] : face_box[3], face_box[0] : face_box[2]]
            res = self.__classify_face(face)

            if not res:
                return {"success": False, "message": "No face was recognized."}

            sub_label, score = res

            return {"success": True, "score": score, "face_name": sub_label}
        elif topic == EmbeddingsRequestEnum.register_face.value:
            rand_id = "".join(
                random.choices(string.ascii_lowercase + string.digits, k=6)
            )
            label = request_data["face_name"]
            id = f"{label}-{rand_id}"

            if request_data.get("cropped"):
                thumbnail = request_data["image"]
            else:
                img = cv2.imdecode(
                    np.frombuffer(
                        base64.b64decode(request_data["image"]), dtype=np.uint8
                    ),
                    cv2.IMREAD_COLOR,
                )

                # detect faces with lower confidence since we expect the face
                # to be visible in uploaded images
                face_box = self.__detect_face(img, 0.5)

                if not face_box:
                    return {
                        "message": "No face was detected.",
                        "success": False,
                    }

                face = img[face_box[1] : face_box[3], face_box[0] : face_box[2]]
                _, thumbnail = cv2.imencode(
                    ".webp", face, [int(cv2.IMWRITE_WEBP_QUALITY), 100]
                )

            # write face to library
            folder = os.path.join(FACE_DIR, label)
            file = os.path.join(folder, f"{id}.webp")
            os.makedirs(folder, exist_ok=True)

            # save face image
            with open(file, "wb") as output:
                output.write(thumbnail.tobytes())

            self.__clear_classifier()
            return {
                "message": "Successfully registered face.",
                "success": True,
            }
        elif topic == EmbeddingsRequestEnum.reprocess_face.value:
            current_file: str = request_data["image_file"]
            id = current_file[0 : current_file.index("-", current_file.index("-") + 1)]
            face_score = current_file[current_file.rfind("-") : current_file.rfind(".")]
            img = None

            if current_file:
                img = cv2.imread(current_file)

            if img is None:
                return {
                    "message": "Invalid image file.",
                    "success": False,
                }

            res = self.__classify_face(img)

            if not res:
                return

            sub_label, score = res

            if self.config.face_recognition.save_attempts:
                # write face to library
                folder = os.path.join(FACE_DIR, "train")
                new_file = os.path.join(
                    folder, f"{id}-{sub_label}-{score}-{face_score}.webp"
                )
                shutil.move(current_file, new_file)

                files = sorted(
                    filter(lambda f: (f.endswith(".webp")), os.listdir(folder)),
                    key=lambda f: os.path.getctime(os.path.join(folder, f)),
                    reverse=True,
                )

                # delete oldest face image if maximum is reached
                if len(files) > self.config.face_recognition.save_attempts:
                    os.unlink(os.path.join(folder, files[-1]))

    def expire_object(self, object_id: str):
        if object_id in self.detected_faces:
            self.detected_faces.pop(object_id)
