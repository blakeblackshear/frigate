"""Handle processing images for face detection and recognition."""

import base64
import datetime
import json
import logging
import os
import shutil
from typing import Any

import cv2
import numpy as np

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum
from frigate.comms.event_metadata_updater import (
    EventMetadataPublisher,
    EventMetadataTypeEnum,
)
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.const import FACE_DIR
from frigate.data_processing.common.face.detector import FaceDetector
from frigate.data_processing.common.face.recognizer import (
    ArcFaceRecognizer,
    FaceNetRecognizer,
    FaceRecognizer,
)
from frigate.types import TrackedObjectUpdateTypesEnum
from frigate.util.builtin import EventsPerSecond, InferenceSpeed
from frigate.util.file import trim_oldest_files
from frigate.util.image import area
from frigate.util.path import safe_join, sanitize_path_component

from ..types import DataProcessorMetrics
from .api import RealTimeProcessorApi

logger = logging.getLogger(__name__)


MAX_FACES_ATTEMPTS_AFTER_REC = 6
MAX_FACE_ATTEMPTS = 12


class FaceRealTimeProcessor(RealTimeProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        requestor: InterProcessRequestor,
        sub_label_publisher: EventMetadataPublisher,
        metrics: DataProcessorMetrics,
    ):
        super().__init__(config, metrics)
        self.face_config = config.face_recognition
        self.requestor = requestor
        self.sub_label_publisher = sub_label_publisher
        self.requires_face_detection = "face" not in self.config.objects.all_objects
        self.person_face_history: dict[str, list[tuple[str, float, int]]] = {}
        self.camera_current_people: dict[str, list[str]] = {}
        self.recognizer: FaceRecognizer
        self.faces_per_second = EventsPerSecond()
        self.inference_speed = InferenceSpeed(self.metrics.face_rec_speed)

        self.face_detector = FaceDetector(on_ready=self.faces_per_second.start)

        self.label_map: dict[int, str] = {}

        if self.face_config.model_size == "small":
            self.recognizer = FaceNetRecognizer(self.config, self.face_detector)
        else:
            self.recognizer = ArcFaceRecognizer(self.config, self.face_detector)

        self.recognizer.build()

    CONFIG_UPDATE_TOPIC = "config/face_recognition"

    def update_config(self, topic: str, payload: Any) -> None:
        """Update face recognition config at runtime."""
        if topic != self.CONFIG_UPDATE_TOPIC:
            return

        previous_min_area = self.config.face_recognition.min_area
        self.config.face_recognition = payload
        self.face_config = payload

        for camera_config in self.config.cameras.values():
            if camera_config.face_recognition.min_area == previous_min_area:
                camera_config.face_recognition.min_area = payload.min_area

        logger.debug("Face recognition config updated dynamically")

    def __update_metrics(self, duration: float) -> None:
        self.faces_per_second.update()
        self.inference_speed.update(duration)

    def process_frame(self, obj_data: dict[str, Any], frame: np.ndarray) -> None:
        """Look for faces in image."""
        self.metrics.face_rec_fps.value = self.faces_per_second.eps()
        camera = obj_data["camera"]

        if not self.config.cameras[camera].face_recognition.enabled:
            logger.debug(f"Face recognition disabled for camera {camera}, skipping")
            return

        start = datetime.datetime.now().timestamp()
        id = obj_data["id"]

        # don't run for non person objects
        if obj_data.get("label") != "person":
            logger.debug("Not processing face for a non person object.")
            return

        # don't overwrite sub label for objects that have a sub label
        # that is not a face
        if obj_data.get("sub_label") and id not in self.person_face_history:
            logger.debug(
                f"Not processing face due to existing sub label: {obj_data.get('sub_label')}."
            )
            return

        # check if we have hit limits
        if (
            id in self.person_face_history
            and len(self.person_face_history[id]) >= MAX_FACES_ATTEMPTS_AFTER_REC
        ):
            # if we are at max attempts after rec and we have a rec
            if obj_data.get("sub_label"):
                logger.debug(
                    "Not processing due to hitting max attempts after true recognition."
                )
                return

            # if we don't have a rec and are at max attempts
            if len(self.person_face_history[id]) >= MAX_FACE_ATTEMPTS:
                logger.debug("Not processing due to hitting max rec attempts.")
                return

        face: dict[str, Any] | None = None
        face_box: tuple[int, int, int, int]

        if self.requires_face_detection:
            logger.debug("Running manual face detection.")
            person_box = obj_data.get("box")

            if not person_box:
                logger.debug(f"No person box available for {id}")
                return

            # YuNet (cv2.FaceDetectorYN) is trained on BGR
            bgr = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)
            left, top, right, bottom = person_box
            person = bgr[top:bottom, left:right]
            detection = self.face_detector.detect(
                person, self.face_config.detection_threshold
            )

            if detection is None:
                logger.debug("Detected no faces for person object.")
                return

            face_box = detection.face
            face_frame = person[
                max(0, face_box[1]) : min(frame.shape[0], face_box[3]),
                max(0, face_box[0]) : min(frame.shape[1], face_box[2]),
            ]

            # check that face is correct size
            if area(face_box) < self.config.cameras[camera].face_recognition.min_area:
                logger.debug(
                    f"Detected face that is smaller than the min_area {face} < {self.config.cameras[camera].face_recognition.min_area}"
                )
                return

        else:
            # don't run for object without attributes
            if not obj_data.get("current_attributes"):
                logger.debug("No attributes to parse.")
                return

            attributes: list[dict[str, Any]] = obj_data.get("current_attributes", [])
            for attr in attributes:
                if attr.get("label") != "face":
                    continue

                if face is None or attr.get("score", 0.0) > face.get("score", 0.0):
                    face = attr

            # no faces detected in this frame
            if not face:
                logger.debug(f"No face attributes found for {id}")
                return

            attr_box = face.get("box")

            # check that face is valid
            if (
                not attr_box
                or area(attr_box)
                < self.config.cameras[camera].face_recognition.min_area
            ):
                logger.debug(f"Invalid face box {face}")
                return

            face_box = attr_box

            face_frame = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)

            face_frame = face_frame[
                max(0, face_box[1]) : min(frame.shape[0], face_box[3]),
                max(0, face_box[0]) : min(frame.shape[1], face_box[2]),
            ]

        if face_frame.size == 0:
            logger.debug(f"Empty face crop for {id}")
            return

        res = self.recognizer.classify(face_frame)

        if not res:
            logger.debug(f"Face recognizer returned no result for {id}")
            self.__update_metrics(datetime.datetime.now().timestamp() - start)
            return

        sub_label, score = res

        if score <= self.face_config.unknown_score:
            sub_label = "unknown"

        logger.debug(
            f"Detected best face for person as: {sub_label} with probability {score}"
        )

        self.write_face_attempt(
            face_frame, id, datetime.datetime.now().timestamp(), sub_label, score
        )

        if id not in self.person_face_history:
            self.person_face_history[id] = []

            if camera not in self.camera_current_people:
                self.camera_current_people[camera] = []

            self.camera_current_people[camera].append(id)

        self.person_face_history[id].append(
            (sub_label, score, face_frame.shape[0] * face_frame.shape[1])
        )
        (weighted_sub_label, weighted_score) = self.weighted_average(
            self.person_face_history[id]
        )

        self.requestor.send_data(
            "tracked_object_update",
            json.dumps(
                {
                    "type": TrackedObjectUpdateTypesEnum.face,
                    "name": weighted_sub_label,
                    "score": weighted_score,
                    "id": id,
                    "camera": camera,
                    "timestamp": start,
                }
            ),
        )

        if weighted_score >= self.face_config.recognition_threshold:
            self.sub_label_publisher.publish(
                (id, weighted_sub_label, weighted_score),
                EventMetadataTypeEnum.sub_label.value,
            )

        self.__update_metrics(datetime.datetime.now().timestamp() - start)

    def handle_request(
        self, topic: str, request_data: dict[str, Any]
    ) -> dict[str, Any] | None:
        if topic == EmbeddingsRequestEnum.clear_face_classifier.value:
            self.recognizer.clear()
            return {"success": True, "message": "Face classifier cleared."}
        elif topic == EmbeddingsRequestEnum.recognize_face.value:
            img = cv2.imdecode(
                np.frombuffer(base64.b64decode(request_data["image"]), dtype=np.uint8),
                cv2.IMREAD_COLOR,
            )

            # detect faces with lower confidence since we expect the face
            # to be visible in uploaded images
            detection = self.face_detector.detect(img, 0.5)

            if detection is None:
                return {"message": "No face was detected.", "success": False}

            face_box = detection.face
            face = img[face_box[1] : face_box[3], face_box[0] : face_box[2]]
            res = self.recognizer.classify(face)

            if not res:
                return {"success": False, "message": "No face was recognized."}

            sub_label, score = res

            if score <= self.face_config.unknown_score:
                sub_label = "unknown"

            return {"success": True, "score": score, "face_name": sub_label}
        elif topic == EmbeddingsRequestEnum.register_face.value:
            label = request_data["face_name"]

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
                detection = self.face_detector.detect(img, 0.5)

                if detection is None:
                    return {
                        "message": "No face was detected.",
                        "success": False,
                    }

                face_box = detection.face
                face = img[face_box[1] : face_box[3], face_box[0] : face_box[2]]
                _, thumbnail = cv2.imencode(
                    ".webp", face, [int(cv2.IMWRITE_WEBP_QUALITY), 100]
                )

            # write face to library
            sanitized_label = sanitize_path_component(label)
            folder = safe_join(FACE_DIR, label)

            if sanitized_label is None or folder is None:
                return {
                    "message": f"Invalid face name: {label}",
                    "success": False,
                }

            file = os.path.join(
                folder, f"{sanitized_label}_{datetime.datetime.now().timestamp()}.webp"
            )
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
            (id_time, id_rand, timestamp, _, _) = current_file.split("-")
            img = None
            id = f"{id_time}-{id_rand}"

            if current_file:
                img = cv2.imread(current_file)

            if img is None:
                return {  # type: ignore[unreachable]
                    "message": "Invalid image file.",
                    "success": False,
                }

            res = self.recognizer.classify(img)

            if not res:
                return {
                    "message": "Model is still training, please try again in a few moments.",
                    "success": False,
                }

            sub_label, score = res

            if score <= self.face_config.unknown_score:
                sub_label = "unknown"

            if "-" in sub_label:
                sub_label = sub_label.replace("-", "_")

            if self.config.face_recognition.save_attempts:
                # write face to library
                folder = os.path.join(FACE_DIR, "train")
                os.makedirs(folder, exist_ok=True)
                new_file = os.path.join(
                    folder, f"{id}-{timestamp}-{sub_label}-{score}.webp"
                )
                shutil.move(current_file, new_file)

            return {
                "message": f"Successfully reprocessed face. Result: {sub_label} (score: {score:.2f})",
                "success": True,
                "face_name": sub_label,
                "score": score,
            }

        return None

    def expire_object(self, object_id: str, camera: str) -> None:
        if object_id in self.person_face_history:
            self.person_face_history.pop(object_id)

            if object_id in self.camera_current_people.get(camera, []):
                self.camera_current_people[camera].remove(object_id)

    def weighted_average(
        self, results_list: list[tuple[str, float, int]], max_weight: int = 4000
    ) -> tuple[str | None, float]:
        """
        Calculates a robust weighted average, capping the area weight and giving more weight to higher scores.

        Args:
            results_list: A list of tuples, where each tuple contains (name, score, face_area).
            max_weight: The maximum weight to apply based on face area.

        Returns:
            A tuple containing the prominent name and its weighted average score, or (None, 0.0) if the list is empty.
        """
        if not results_list:
            return None, 0.0

        counts: dict[str, int] = {}
        weighted_scores: dict[str, float] = {}
        total_weights: dict[str, float] = {}

        for name, score, face_area in results_list:
            if name == "unknown":
                continue

            if name not in weighted_scores:
                counts[name] = 0
                weighted_scores[name] = 0.0
                total_weights[name] = 0.0

            # increase count
            counts[name] += 1

            # Capped weight based on face area
            weight: float = min(face_area, max_weight)

            # Score-based weighting (higher scores get more weight)
            weight *= (score - self.face_config.unknown_score) * 10
            weighted_scores[name] += score * weight
            total_weights[name] += weight

        if not weighted_scores:
            return None, 0.0

        best_name = max(weighted_scores, key=lambda k: weighted_scores[k])

        # If the number of faces for this person < min_faces, we are not confident it is a correct result
        if counts[best_name] < self.face_config.min_faces:
            return None, 0.0

        # If the best name has the same number of results as another name, we are not confident it is a correct result
        for name, count in counts.items():
            if name != best_name and counts[best_name] == count:
                return None, 0.0

        weighted_average = weighted_scores[best_name] / total_weights[best_name]

        return best_name, weighted_average

    def write_face_attempt(
        self,
        frame: np.ndarray,
        event_id: str,
        timestamp: float,
        sub_label: str,
        score: float,
    ) -> None:
        if self.config.face_recognition.save_attempts:
            # write face to library
            folder = os.path.join(FACE_DIR, "train")

            if "-" in sub_label:
                sub_label = sub_label.replace("-", "_")

            file = os.path.join(
                folder, f"{event_id}-{timestamp}-{sub_label}-{score}.webp"
            )
            os.makedirs(folder, exist_ok=True)
            cv2.imwrite(file, frame)
            trim_oldest_files(folder, self.config.face_recognition.save_attempts)
