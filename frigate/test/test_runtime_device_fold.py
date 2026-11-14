"""Tests for folding loaded model devices per enrichment and emitting them."""

import unittest
from types import SimpleNamespace

from frigate.config import FrigateConfig
from frigate.embeddings.types import ENRICHMENT_FOR_MODEL_TYPE, fold_runtime_devices
from frigate.stats.util import embeddings_stats


class TestFoldRuntimeDevices(unittest.TestCase):
    def test_every_enrichment_model_type_is_mapped(self):
        self.assertEqual(
            set(ENRICHMENT_FOR_MODEL_TYPE),
            {
                "arcface",
                "facenet",
                "jina_v1",
                "jina_v2",
                "paddleocr",
                "yolov9_license_plate",
            },
        )

    def test_non_cpu_wins_within_an_enrichment(self):
        # jina v1 pins its text model to the CPU by design
        loaded = {
            "/m/jina_v1_text.onnx": ("jina_v1", "CPU"),
            "/m/jina_v1_vision.onnx": ("jina_v1", "OpenVINO GPU"),
        }
        self.assertEqual(
            fold_runtime_devices(loaded), {"semantic_search": "OpenVINO GPU"}
        )

    def test_all_cpu_stays_cpu(self):
        loaded = {
            "/m/jina_v1_text.onnx": ("jina_v1", "CPU"),
            "/m/jina_v1_vision.onnx": ("jina_v1", "CPU"),
        }
        self.assertEqual(fold_runtime_devices(loaded), {"semantic_search": "CPU"})

    def test_detector_models_are_ignored(self):
        loaded = {"/m/yolo.onnx": ("yolov9", "CUDA")}
        self.assertEqual(fold_runtime_devices(loaded), {})

    def test_lpr_and_face(self):
        loaded = {
            "/m/det.onnx": ("paddleocr", "CUDA"),
            "/m/rec.onnx": ("paddleocr", "CUDA"),
            "/m/arcface.onnx": ("arcface", "CPU"),
        }
        self.assertEqual(
            fold_runtime_devices(loaded), {"lpr": "CUDA", "face_recognition": "CPU"}
        )


def _metrics(devices: dict[str, str]) -> SimpleNamespace:
    value = SimpleNamespace(value=0.0)
    return SimpleNamespace(
        image_embeddings_speed=value,
        image_embeddings_eps=value,
        text_embeddings_speed=value,
        text_embeddings_eps=value,
        face_rec_speed=value,
        face_rec_fps=value,
        alpr_speed=value,
        alpr_pps=value,
        yolov9_lpr_speed=value,
        yolov9_lpr_pps=value,
        review_desc_speed=value,
        review_desc_dps=value,
        object_desc_speed=value,
        object_desc_dps=value,
        classification_speeds={},
        classification_cps={},
        runtime_devices=devices,
    )


class TestEmbeddingsStats(unittest.TestCase):
    def setUp(self):
        self.config = FrigateConfig(
            **{
                "mqtt": {"host": "mqtt"},
                "face_recognition": {"enabled": True},
                "cameras": {
                    "front_door": {
                        "ffmpeg": {
                            "inputs": [
                                {
                                    "path": "rtsp://10.0.0.1:554/video",
                                    "roles": ["detect"],
                                }
                            ]
                        }
                    }
                },
            }
        )

    def test_devices_emitted_when_present(self):
        stats = embeddings_stats(self.config, _metrics({"face_recognition": "CUDA"}))
        self.assertEqual(stats["devices"], {"face_recognition": "CUDA"})
        self.assertIn("face_recognition_speed", stats)

    def test_devices_omitted_when_empty(self):
        stats = embeddings_stats(self.config, _metrics({}))
        self.assertNotIn("devices", stats)
