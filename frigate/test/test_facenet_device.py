"""Tests that the tflite face model reports a runtime device."""

import unittest
from unittest.mock import MagicMock, patch

from frigate.detectors.detection_runners import loaded_devices, snapshot_loaded_devices

try:
    from frigate.embeddings.onnx import face_embedding
except ImportError:  # tflite runtime is not installed everywhere
    face_embedding = None


@unittest.skipIf(face_embedding is None, "tflite runtime not available")
class TestFaceNetDevice(unittest.TestCase):
    def setUp(self):
        loaded_devices.clear()

    def test_facenet_records_cpu(self):
        with (
            patch.object(face_embedding, "Interpreter", return_value=MagicMock()),
            patch.object(face_embedding.os.path, "exists", return_value=True),
        ):
            embedding = face_embedding.FaceNetEmbedding()

        recorded = list(snapshot_loaded_devices().values())
        self.assertEqual(recorded, [("facenet", "CPU")])
        self.assertIsNotNone(embedding.runner)
