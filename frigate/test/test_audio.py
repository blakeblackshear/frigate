"""Tests for audio label mapping."""

import threading
import unittest
from unittest.mock import Mock

import numpy as np

from frigate.events.audio import AudioTfl


class TestAudioTfl(unittest.TestCase):
    def setUp(self):
        self.detector = AudioTfl.__new__(AudioTfl)
        self.detector.stop_event = threading.Event()
        self.detector._default_labels = {
            69: "dog",
            70: "bark",
            75: "whimper_dog",
            117: "dogs",
        }

    def test_update_labelmap_replaces_and_resets_overrides(self):
        self.detector.update_labelmap({69: "dogs", 70: "dogs"})
        assert self.detector.labels == {
            69: "dogs",
            70: "dogs",
            75: "whimper_dog",
            117: "dogs",
        }

        self.detector.update_labelmap({75: "whimper"})
        assert self.detector.labels == {
            69: "dog",
            70: "bark",
            75: "whimper",
            117: "dogs",
        }

    def test_detect_returns_highest_scoring_detection_for_grouped_label(self):
        self.detector.update_labelmap({69: "dogs", 70: "dogs", 75: "dogs"})
        self.detector._detect_raw = Mock(
            return_value=np.array(
                [
                    [117, 0.95, -1, -1, -1, -1],
                    [70, 0.9, -1, -1, -1, -1],
                    [69, 0.8, -1, -1, -1, -1],
                    [75, 0.7, -1, -1, -1, -1],
                ],
                dtype=np.float32,
            )
        )

        detections = self.detector.detect(np.array([], dtype=np.float32))

        assert len(detections) == 1
        assert detections[0][0] == "dogs"
        self.assertAlmostEqual(detections[0][1], 0.95)

    def test_each_dog_audio_label_maps_to_grouped_label(self):
        self.detector.update_labelmap({69: "dogs", 70: "dogs", 75: "dogs"})

        for class_id in (69, 70, 75):
            with self.subTest(class_id=class_id):
                self.detector._detect_raw = Mock(
                    return_value=np.array(
                        [[class_id, 0.9, -1, -1, -1, -1]], dtype=np.float32
                    )
                )

                detections = self.detector.detect(np.array([], dtype=np.float32))

                assert len(detections) == 1
                assert detections[0][0] == "dogs"
                self.assertAlmostEqual(detections[0][1], 0.9)
