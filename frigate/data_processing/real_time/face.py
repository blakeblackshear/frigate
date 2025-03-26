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
from frigate.data_processing.common.face.model import (
    ArcFaceRecognizer,
    FaceRecognizer,
    LBPHRecognizer,
)
from frigate.util.image import area

from ..types import DataProcessorMetrics
from .api import RealTimeProcessorApi

logger = logging.getLogger(__name__)


MAX_DETECTION_HEIGHT = 1080
MIN_MATCHING_FACES = 2


def weighted_average_by_area(results_list: list[tuple[str, float, int]]):
    if len(results_list) < 3:
        return "unknown", 0.0

    score_count = {}
    weighted_scores = {}
    total_face_areas = {}

    for name, score, face_area in results_list:
        if name not in weighted_scores:
            score_count[name] = 1
            weighted_scores[name] = 0.0
            total_face_areas[name] = 0.0
        else:
            score_count[name] += 1

        weighted_scores[name] += score * face_area
        total_face_areas[name] += face_area

    prominent_name = max(score_count)

    # if a single name is not prominent in the history then we are not confident
    if score_count[prominent_name] / len(results_list) < 0.65:
        return "unknown", 0.0

    return prominent_name, weighted_scores[prominent_name] / total_face_areas[
        prominent_name
    ]


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
        self.requires_face_detection = "face" not in self.config.objects.all_objects
        self.person_face_history: dict[str, list[tuple[str, float, int]]] = {}
        self.recognizer: FaceRecognizer | None = None

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

        if self.face_config.model_size == "small":
            self.recognizer = LBPHRecognizer(self.config)
        else:
            self.recognizer = ArcFaceRecognizer(self.config)

        self.recognizer.build()

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

    def __update_metrics(self, duration: float) -> None:
        self.metrics.face_rec_fps.value = (
            self.metrics.face_rec_fps.value * 9 + duration
        ) / 10

    def process_frame(self, obj_data: dict[str, any], frame: np.ndarray):
        """Look for faces in image."""
        if not self.config.cameras[obj_data["camera"]].face_recognition.enabled:
            return

        start = datetime.datetime.now().timestamp()
        id = obj_data["id"]

        # don't run for non person objects
        if obj_data.get("label") != "person":
            logger.debug("Not a processing face for non person object.")
            return

        # don't overwrite sub label for objects that have a sub label
        # that is not a face
        if obj_data.get("sub_label") and id not in self.person_face_history:
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

            try:
                face_frame = cv2.cvtColor(face_frame, cv2.COLOR_RGB2BGR)
            except Exception:
                return
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
            if (
                not face_box
                or area(face_box)
                < self.config.cameras[obj_data["camera"]].face_recognition.min_area
            ):
                logger.debug(f"Invalid face box {face}")
                return

            face_frame = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)

            face_frame = face_frame[
                max(0, face_box[1]) : min(frame.shape[0], face_box[3]),
                max(0, face_box[0]) : min(frame.shape[1], face_box[2]),
            ]

        res = self.recognizer.classify(face_frame)

        if not res:
            self.__update_metrics(datetime.datetime.now().timestamp() - start)
            return

        sub_label, score = res

        logger.debug(
            f"Detected best face for person as: {sub_label} with probability {score}"
        )

        if self.config.face_recognition.save_attempts:
            # write face to library
            folder = os.path.join(FACE_DIR, "train")
            file = os.path.join(folder, f"{id}-{sub_label}-{score}-0.webp")
            os.makedirs(folder, exist_ok=True)
            cv2.imwrite(file, face_frame)

        if id not in self.person_face_history:
            self.person_face_history[id] = []

        self.person_face_history[id].append(
            (sub_label, score, face_frame.shape[0] * face_frame.shape[1])
        )
        (weighted_sub_label, weighted_score) = weighted_average_by_area(
            self.person_face_history[id]
        )

        if weighted_score >= self.face_config.recognition_threshold:
            self.sub_label_publisher.publish(
                EventMetadataTypeEnum.sub_label,
                (id, weighted_sub_label, weighted_score),
            )

        self.__update_metrics(datetime.datetime.now().timestamp() - start)

    def handle_request(self, topic, request_data) -> dict[str, any] | None:
        if topic == EmbeddingsRequestEnum.clear_face_classifier.value:
            self.recognizer.clear()
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
            res = self.recognizer.classify(face)

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

            self.recognizer.clear()
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

            res = self.recognizer.classify(img)

            if not res:
                return

            sub_label, score = res

            if self.config.face_recognition.save_attempts:
                # write face to library
                folder = os.path.join(FACE_DIR, "train")
                os.makedirs(folder, exist_ok=True)
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
        if object_id in self.person_face_history:
            self.person_face_history.pop(object_id)
