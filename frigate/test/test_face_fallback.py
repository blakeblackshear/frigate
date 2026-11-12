"""Face-attribute fallback tests without cameras, model downloads, or private images."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import cv2
import numpy as np

from frigate.data_processing.real_time import face


class TestFaceFallback(unittest.TestCase):
    def setUp(self):
        self.processor = face.FaceRealTimeProcessor.__new__(face.FaceRealTimeProcessor)
        p = self.processor
        p.config = SimpleNamespace(
            cameras={
                "camera": SimpleNamespace(
                    face_recognition=SimpleNamespace(enabled=True, min_area=750)
                )
            }
        )
        p.face_config = SimpleNamespace(
            detection_threshold=0.7,
            unknown_score=0.8,
            recognition_threshold=0.9,
            min_faces=1,
        )
        p.metrics = MagicMock()
        p.faces_per_second = MagicMock()
        p.inference_speed = MagicMock()
        p.person_face_history = {}
        p.camera_current_people = {}
        p.last_face_detection = {}
        p.requires_face_detection = False
        p.face_detector = MagicMock()
        p.face_detector.detect.return_value = SimpleNamespace(face=(10, 20, 70, 80))
        p.recognizer = MagicMock()
        p.recognizer.classify.return_value = None
        p.write_face_attempt = MagicMock()
        p.requestor = MagicMock()
        p.sub_label_publisher = MagicMock()
        self.data = {
            "id": "person-1",
            "camera": "camera",
            "label": "person",
            "box": (20, 10, 140, 110),
            "current_attributes": [],
        }
        image = np.zeros((120, 160, 3), np.uint8)
        image[30:60, 30:60] = 255
        self.frame = cv2.cvtColor(image, cv2.COLOR_BGR2YUV_I420)

    def process(self):
        self.processor.process_frame(self.data, self.frame)

    def test_missing_attribute_uses_person_crop_and_original_pixels(self):
        self.process()
        p = self.processor
        person, threshold = p.face_detector.detect.call_args.args
        self.assertEqual(person.shape, (100, 120, 3))
        self.assertEqual(threshold, 0.7)
        crop = p.recognizer.classify.call_args.args[0]
        original = cv2.cvtColor(self.frame, cv2.COLOR_YUV2BGR_I420)
        np.testing.assert_array_equal(crop, original[30:90, 30:90])

    def test_none_attributes_use_fallback(self):
        self.data["current_attributes"] = None
        self.process()
        self.processor.face_detector.detect.assert_called_once()
        self.processor.recognizer.classify.assert_called_once()

    def test_valid_attribute_avoids_fallback(self):
        self.data["current_attributes"] = [
            {"label": "face", "score": 0.9, "box": (30, 30, 90, 90)}
        ]
        self.process()
        self.processor.face_detector.detect.assert_not_called()
        self.processor.recognizer.classify.assert_called_once()

    def test_small_attribute_can_recover_larger_face(self):
        self.data["current_attributes"] = [
            {"label": "face", "score": 0.9, "box": (30, 30, 40, 40)}
        ]
        self.process()
        self.processor.face_detector.detect.assert_called_once()
        self.processor.recognizer.classify.assert_called_once()

    def test_fallback_is_throttled_and_expired(self):
        with patch.object(face, "time") as clock:
            clock.monotonic.return_value = 100
            self.process()
            clock.monotonic.return_value = 100.5
            self.process()
            self.assertEqual(self.processor.face_detector.detect.call_count, 1)
            clock.monotonic.return_value = 101
            self.process()
            self.assertEqual(self.processor.face_detector.detect.call_count, 2)
        self.processor.expire_object("person-1", "camera")
        self.assertNotIn("person-1", self.processor.last_face_detection)

    def test_standalone_detector_cadence_is_preserved(self):
        self.processor.requires_face_detection = True
        self.process()
        self.process()
        self.assertEqual(self.processor.face_detector.detect.call_count, 2)
        self.assertFalse(self.processor.last_face_detection)

    def test_missing_face_does_not_consume_recognition_budget(self):
        self.processor.face_detector.detect.return_value = None
        self.process()
        self.processor.recognizer.classify.assert_not_called()
        self.assertFalse(self.processor.person_face_history)

    def test_small_fallback_face_is_rejected(self):
        self.processor.face_detector.detect.return_value = SimpleNamespace(
            face=(10, 10, 20, 20)
        )
        self.process()
        self.processor.recognizer.classify.assert_not_called()

    def test_invalid_person_boxes_do_not_reach_detector(self):
        for box in [None, (20, 20, 10, 10), (200, 200, 300, 300)]:
            self.processor.last_face_detection.clear()
            self.data["box"] = box
            self.process()
        self.processor.face_detector.detect.assert_not_called()

    def test_clipped_person_box_stays_in_frame(self):
        self.data["box"] = (-10, -10, 200, 200)
        self.process()
        self.assertEqual(
            self.processor.face_detector.detect.call_args.args[0].shape, (120, 160, 3)
        )

    def test_disabled_and_nonperson_are_not_processed(self):
        self.processor.config.cameras["camera"].face_recognition.enabled = False
        self.process()
        self.processor.config.cameras["camera"].face_recognition.enabled = True
        self.data["label"] = "car"
        self.process()
        self.processor.face_detector.detect.assert_not_called()

    def test_existing_recognition_limit_is_preserved(self):
        self.processor.person_face_history["person-1"] = [
            ("unknown", 0.1, 1000)
        ] * face.MAX_FACE_ATTEMPTS
        self.process()
        self.processor.face_detector.detect.assert_not_called()

    def test_successful_recognition_keeps_metadata_path(self):
        self.processor.recognizer.classify.return_value = ("Known", 0.95)
        self.process()
        self.processor.write_face_attempt.assert_called_once()
        self.processor.requestor.send_data.assert_called_once()
        self.processor.sub_label_publisher.publish.assert_called_once()
        self.assertEqual(
            self.processor.person_face_history["person-1"], [("Known", 0.95, 3600)]
        )
