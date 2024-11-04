import logging
import re
from typing import Optional

import cv2
import numpy as np
import requests

from frigate.const import FRIGATE_LOCALHOST
from frigate.util.builtin import serialize
from frigate.util.image import area

logger = logging.getLogger(__name__)

REQUIRED_FACES = 2
MAX_THUMBNAILS = 10


class EmbeddingsMixin:
    """Shared properties and processing methods for embeddings."""

    def _search_face(self, query_embedding: bytes) -> list[tuple[str, float]]:
        """Search for the face most closely matching the embedding."""
        sql_query = f"""
            SELECT
                id,
                distance
            FROM vec_faces
            WHERE face_embedding MATCH ?
                AND k = {REQUIRED_FACES} ORDER BY distance
        """
        return self.embeddings.db.execute_sql(sql_query, [query_embedding]).fetchall()

    def _detect_face(self, input: np.ndarray) -> tuple[int, int, int, int]:
        """Detect faces in input image."""
        self.face_detector.setInputSize((input.shape[1], input.shape[0]))
        faces = self.face_detector.detect(input)

        if faces[1] is None:
            return None

        face = None

        for _, potential_face in enumerate(faces[1]):
            raw_bbox = potential_face[0:4].astype(np.uint16)
            x: int = max(raw_bbox[0], 0)
            y: int = max(raw_bbox[1], 0)
            w: int = raw_bbox[2]
            h: int = raw_bbox[3]
            bbox = (x, y, x + w, y + h)

            if face is None or area(bbox) > area(face):
                face = bbox

        return face

    def _process_face(self, obj_data: dict[str, any], frame: np.ndarray) -> None:
        """Look for faces in image."""
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
                return None

            rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2RGB_I420)
            left, top, right, bottom = person_box
            person = rgb[top:bottom, left:right]
            face = self._detect_face(person)

            if not face:
                logger.debug("Detected no faces for person object.")
                return

            face_frame = person[face[1] : face[3], face[0] : face[2]]
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
                face_box[1] : face_box[3], face_box[0] : face_box[2]
            ]

        ret, webp = cv2.imencode(
            ".webp", face_frame, [int(cv2.IMWRITE_WEBP_QUALITY), 100]
        )

        if not ret:
            logger.debug("Not processing face due to error creating cropped image.")
            return

        embedding = self.embeddings.embed_face("unknown", webp.tobytes(), upsert=False)
        query_embedding = serialize(embedding)
        best_faces = self._search_face(query_embedding)
        logger.debug(f"Detected best faces for person as: {best_faces}")

        if not best_faces or len(best_faces) < REQUIRED_FACES:
            logger.debug(f"{len(best_faces)} < {REQUIRED_FACES} min required faces.")
            return

        sub_label = str(best_faces[0][0]).split("-")[0]
        avg_score = 0

        for face in best_faces:
            score = 1.0 - face[1]

            if face[0].split("-")[0] != sub_label:
                logger.debug("Detected multiple faces, result is not valid.")
                return

            avg_score += score

        avg_score = round(avg_score / REQUIRED_FACES, 2)

        if avg_score < self.config.face_recognition.threshold or (
            id in self.detected_faces and avg_score <= self.detected_faces[id]
        ):
            logger.debug(
                f"Recognized face score {avg_score} is less than threshold ({self.config.face_recognition.threshold}) / previous face score ({self.detected_faces.get(id)})."
            )
            return

        resp = requests.post(
            f"{FRIGATE_LOCALHOST}/api/events/{id}/sub_label",
            json={
                "camera": obj_data.get("camera"),
                "subLabel": sub_label,
                "subLabelScore": avg_score,
            },
        )

        if resp.status_code == 200:
            self.detected_faces[id] = avg_score

    def _detect_license_plate(self, input: np.ndarray) -> tuple[int, int, int, int]:
        """Return the dimensions of the input image as [x, y, width, height]."""
        height, width = input.shape[:2]
        return (0, 0, width, height)

    def _process_license_plate(
        self, obj_data: dict[str, any], frame: np.ndarray
    ) -> None:
        """Look for license plates in image."""
        id = obj_data["id"]

        # don't run for non car objects
        if obj_data.get("label") != "car":
            logger.debug("Not a processing license plate for non car object.")
            return

        # don't run for stationary car objects
        if obj_data.get("stationary") == True:
            logger.debug("Not a processing license plate for a stationary car object.")
            return

        # don't overwrite sub label for objects that have a sub label
        # that is not a license plate
        if obj_data.get("sub_label") and id not in self.detected_license_plates:
            logger.debug(
                f"Not processing license plate due to existing sub label: {obj_data.get('sub_label')}."
            )
            return

        license_plate: Optional[dict[str, any]] = None

        if self.requires_license_plate_detection:
            logger.debug("Running manual license_plate detection.")
            car_box = obj_data.get("box")

            if not car_box:
                return None

            rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2RGB_I420)
            left, top, right, bottom = car_box
            car = rgb[top:bottom, left:right]
            license_plate = self._detect_license_plate(car)

            if not license_plate:
                logger.debug("Detected no license plates for car object.")
                return

            license_plate_frame = car[
                license_plate[1] : license_plate[3], license_plate[0] : license_plate[2]
            ]
            license_plate_frame = cv2.cvtColor(license_plate_frame, cv2.COLOR_RGB2BGR)
        else:
            # don't run for object without attributes
            if not obj_data.get("current_attributes"):
                logger.debug("No attributes to parse.")
                return

            attributes: list[dict[str, any]] = obj_data.get("current_attributes", [])
            for attr in attributes:
                if attr.get("label") != "license_plate":
                    continue

                if license_plate is None or attr.get("score", 0.0) > license_plate.get(
                    "score", 0.0
                ):
                    license_plate = attr

            # no license plates detected in this frame
            if not license_plate:
                return

            license_plate_box = license_plate.get("box")

            # check that license plate is valid
            if (
                not license_plate_box
                or area(license_plate_box) < self.config.lpr.min_area
            ):
                logger.debug(f"Invalid license plate box {license_plate}")
                return

            license_plate_frame = cv2.cvtColor(frame, cv2.COLOR_YUV2BGR_I420)
            license_plate_frame = license_plate_frame[
                license_plate_box[1] : license_plate_box[3],
                license_plate_box[0] : license_plate_box[2],
            ]

        # run detection, returns results sorted by confidence, best first
        license_plates, confidences, areas = (
            self.license_plate_recognition.process_license_plate(license_plate_frame)
        )

        logger.debug(f"Text boxes: {license_plates}")
        logger.debug(f"Confidences: {confidences}")
        logger.debug(f"Areas: {areas}")

        if license_plates:
            for plate, confidence, text_area in zip(license_plates, confidences, areas):
                avg_confidence = (
                    (sum(confidence) / len(confidence)) if confidence else 0
                )

                logger.debug(
                    f"Detected text: {plate} (average confidence: {avg_confidence:.2f}, area: {text_area} pixels)"
                )
        else:
            # no plates found
            logger.debug("No text detected")
            return

        top_plate, top_char_confidences, top_area = (
            license_plates[0],
            confidences[0],
            areas[0],
        )
        avg_confidence = (
            (sum(top_char_confidences) / len(top_char_confidences))
            if top_char_confidences
            else 0
        )

        # Check if we have a previously detected plate for this ID
        if id in self.detected_license_plates:
            prev_plate = self.detected_license_plates[id]["plate"]
            prev_char_confidences = self.detected_license_plates[id]["char_confidences"]
            prev_area = self.detected_license_plates[id]["area"]
            prev_avg_confidence = (
                (sum(prev_char_confidences) / len(prev_char_confidences))
                if prev_char_confidences
                else 0
            )

            # Define conditions for keeping the previous plate
            shorter_than_previous = len(top_plate) < len(prev_plate)
            lower_avg_confidence = avg_confidence <= prev_avg_confidence
            smaller_area = top_area < prev_area

            # Compare character-by-character confidence where possible
            min_length = min(len(top_plate), len(prev_plate))
            char_confidence_comparison = sum(
                1
                for i in range(min_length)
                if top_char_confidences[i] <= prev_char_confidences[i]
            )
            worse_char_confidences = char_confidence_comparison >= min_length / 2

            if (shorter_than_previous or smaller_area) and (
                lower_avg_confidence and worse_char_confidences
            ):
                logger.debug(
                    f"Keeping previous plate. New plate stats: "
                    f"length={len(top_plate)}, avg_conf={avg_confidence:.2f}, area={top_area} "
                    f"vs Previous: length={len(prev_plate)}, avg_conf={prev_avg_confidence:.2f}, area={prev_area}"
                )
                return

        # Check against minimum confidence threshold
        if avg_confidence < self.lpr_config.threshold:
            logger.debug(
                f"Average confidence {avg_confidence} is less than threshold ({self.lpr_config.threshold})"
            )
            return

        # Determine subLabel based on known plates, use regex matching
        # Default to the detected plate, use label name if there's a match
        sub_label = next(
            (
                label
                for label, plates in self.lpr_config.known_plates.items()
                if any(re.match(f"^{plate}$", top_plate) for plate in plates)
            ),
            top_plate,
        )

        # Send the result to the API
        resp = requests.post(
            f"{FRIGATE_LOCALHOST}/api/events/{id}/sub_label",
            json={
                "camera": obj_data.get("camera"),
                "subLabel": sub_label,
                "subLabelScore": avg_confidence,
            },
        )

        if resp.status_code == 200:
            self.detected_license_plates[id] = {
                "plate": top_plate,
                "char_confidences": top_char_confidences,
                "area": top_area,
                "frame_time": obj_data["frame_time"],
            }
