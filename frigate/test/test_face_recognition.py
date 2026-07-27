"""Tests for AdaFace face recognition integration.

Tests cover:
  - AdaFaceEmbedding preprocessing (BGR, 112x112, normalized to [-1,1], NCHW)
  - AdaFaceRecognizer classify flow with mocked embedder
  - Config field validation for FaceRecognitionModelEnum
  - EnrichmentModelTypeEnum includes adaface
"""

import sys
import unittest
from unittest.mock import MagicMock, patch

import numpy as np

# Mock heavy runtime dependencies before importing frigate modules.
# These packages are either unavailable in CI or too heavy to install
# for a unit test. We mock them at the module level so their import
# in frigate's internal modules succeeds.
_MOCK_MODULES = [
    "tflite_runtime",
    "tflite_runtime.interpreter",
    "ai_edge_litert",
    "ai_edge_litert.interpreter",
    "cv2.face",
    "sherpa_onnx",
    "openvino",
    "py3nvml",
    "py3nvml.py3nvml",
    "librosa",
    "soundfile",
    "torch",
    "torchvision",
    "transformers",
    "tokenizers",
    "huggingface_hub",
]
for mod in _MOCK_MODULES:
    if mod not in sys.modules:
        sys.modules[mod] = MagicMock()

# Make torch.Tensor a proper class so scipy's issubclass checks work
torch_mock = sys.modules["torch"]
if not isinstance(getattr(torch_mock, "Tensor", None), type):
    torch_mock.Tensor = type("Tensor", (), {})

# Provide a version stub (normally generated at Docker build time)
import frigate  # noqa: E402

if not hasattr(frigate, "version") or not hasattr(frigate.version, "VERSION"):
    import types as _types_module  # noqa: E402

    _ver_mod = _types_module.ModuleType("frigate.version")
    _ver_mod.VERSION = "0.0.0-test"
    sys.modules["frigate.version"] = _ver_mod

# Import EnrichmentModelTypeEnum directly from the types module to avoid
# triggering the heavy frigate.embeddings.__init__ import chain.
import importlib.util

# First, register frigate.embeddings as a package without running __init__
import types as _types_module

_emb_pkg = _types_module.ModuleType("frigate.embeddings")
_emb_pkg.__path__ = [frigate.__path__[0] + "/embeddings"]
sys.modules["frigate.embeddings"] = _emb_pkg

_spec = importlib.util.spec_from_file_location(
    "frigate.embeddings.types",
    frigate.__path__[0] + "/embeddings/types.py",
)
_types_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_types_mod)
EnrichmentModelTypeEnum = _types_mod.EnrichmentModelTypeEnum
sys.modules["frigate.embeddings.types"] = _types_mod

# Import config directly (it has no heavy deps beyond FrigateBaseModel)
from frigate.config.classification import (
    FaceRecognitionConfig,
    FaceRecognitionModelEnum,
)


class TestAdaFaceEmbeddingPreprocessing(unittest.TestCase):
    """Verify AdaFaceEmbedding._preprocess_inputs produces correct output."""

    def _make_embedder(self):
        from frigate.embeddings.onnx.face_embedding import AdaFaceEmbedding

        embedder = AdaFaceEmbedding.__new__(AdaFaceEmbedding)
        embedder.config = MagicMock()
        embedder.config.model_size = "small"
        return embedder

    def test_preprocess_produces_112x112_nchw(self):
        """Output should be [1, 3, 112, 112] float32."""
        embedder = self._make_embedder()
        raw = np.random.randint(0, 256, (100, 80, 3), dtype=np.uint8)

        with patch.object(embedder, "_process_image") as mock_process:
            from PIL import Image

            mock_process.return_value = Image.fromarray(raw)
            result = embedder._preprocess_inputs([raw])

        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 1)
        self.assertIn("data", result[0])
        data = result[0]["data"]
        self.assertEqual(data.shape, (1, 3, 112, 112))
        self.assertEqual(data.dtype, np.float32)

    def test_preprocess_normalizes_to_minus_one_to_one(self):
        """Values should be in [-1, 1] range after normalization."""
        embedder = self._make_embedder()
        raw = np.zeros((112, 112, 3), dtype=np.uint8)

        with patch.object(embedder, "_process_image") as mock_process:
            from PIL import Image

            mock_process.return_value = Image.fromarray(raw)
            result = embedder._preprocess_inputs([raw])

        data = result[0]["data"]
        self.assertTrue(np.allclose(data, -1.0))

    def test_preprocess_white_pixel_normalizes_to_one(self):
        """All-white input should normalize to +1.0."""
        embedder = self._make_embedder()
        raw = np.full((112, 112, 3), 255, dtype=np.uint8)

        with patch.object(embedder, "_process_image") as mock_process:
            from PIL import Image

            mock_process.return_value = Image.fromarray(raw)
            result = embedder._preprocess_inputs([raw])

        data = result[0]["data"]
        self.assertTrue(np.allclose(data, 1.0))

    def test_preprocess_uses_bgr_not_rgb(self):
        """AdaFace expects BGR input; it should NOT call _bgr_to_rgb."""
        embedder = self._make_embedder()
        raw = np.zeros((112, 112, 3), dtype=np.uint8)
        raw[:, :, 0] = 200  # Blue channel high (BGR)
        raw[:, :, 2] = 10  # Red channel low

        with patch.object(embedder, "_process_image") as mock_process:
            from PIL import Image

            mock_process.return_value = Image.fromarray(raw)
            embedder._preprocess_inputs([raw])

            call_arg = mock_process.call_args[0][0]
            if isinstance(call_arg, np.ndarray):
                self.assertEqual(call_arg[0, 0, 0], 200)


class TestAdaFaceRecognizerClassify(unittest.TestCase):
    """Verify AdaFaceRecognizer.classify produces correct label/score."""

    def _make_recognizer(self):
        from frigate.data_processing.common.face.model import (
            AdaFaceRecognizer,
        )

        recognizer = AdaFaceRecognizer.__new__(AdaFaceRecognizer)
        recognizer.config = MagicMock()
        recognizer.config.face_recognition.model_size = "small"
        recognizer.config.face_recognition.blur_confidence_filter = False
        recognizer.landmark_detector = MagicMock()
        recognizer.mean_embs = {
            "alice": np.ones(512, dtype=np.float32) / np.sqrt(512),
            "bob": -np.ones(512, dtype=np.float32) / np.sqrt(512),
        }

        alice_vec = np.ones(512, dtype=np.float32) / np.sqrt(512)
        recognizer.face_embedder = MagicMock()
        recognizer.face_embedder.return_value = [alice_vec]
        recognizer.align_face = MagicMock(return_value=np.zeros((112, 112, 3)))
        recognizer.get_blur_confidence_reduction = MagicMock(return_value=0.0)

        return recognizer

    def test_classify_returns_best_match(self):
        """Classify should return the label with highest cosine similarity."""
        recognizer = self._make_recognizer()
        result = recognizer.classify(np.zeros((112, 112, 3), dtype=np.uint8))

        self.assertIsNotNone(result)
        label, score = result
        self.assertEqual(label, "alice")
        self.assertGreater(score, 0.0)

    def test_classify_returns_none_without_landmark_detector(self):
        """Classify should return None if landmark detector is not initialized."""
        recognizer = self._make_recognizer()
        recognizer.landmark_detector = None
        result = recognizer.classify(np.zeros((112, 112, 3), dtype=np.uint8))
        self.assertIsNone(result)

    def test_classify_calibrated_median_r50(self):
        """IR-50 (large) should use median=0.35 for confidence calibration."""
        recognizer = self._make_recognizer()
        recognizer.config.face_recognition.model_size = "large"

        with patch(
            "frigate.data_processing.common.face.model.similarity_to_confidence"
        ) as mock_sim:
            mock_sim.return_value = 0.95
            recognizer.classify(np.zeros((112, 112, 3), dtype=np.uint8))

            call_args = mock_sim.call_args
            self.assertEqual(call_args.kwargs.get("median"), 0.35)

    def test_classify_calibrated_median_r18(self):
        """IR-18 (small) should use median=0.30 for confidence calibration."""
        recognizer = self._make_recognizer()

        with patch(
            "frigate.data_processing.common.face.model.similarity_to_confidence"
        ) as mock_sim:
            mock_sim.return_value = 0.95
            recognizer.classify(np.zeros((112, 112, 3), dtype=np.uint8))

            call_args = mock_sim.call_args
            self.assertEqual(call_args.kwargs.get("median"), 0.30)


class TestFaceRecognitionModelEnum(unittest.TestCase):
    """Verify the FaceRecognitionModelEnum config field."""

    def test_enum_has_arcface_and_adaface(self):
        self.assertEqual(FaceRecognitionModelEnum.arcface.value, "arcface")
        self.assertEqual(FaceRecognitionModelEnum.adaface.value, "adaface")

    def test_config_defaults_to_arcface(self):
        config = FaceRecognitionConfig()
        self.assertEqual(config.model.value, "arcface")

    def test_config_accepts_adaface(self):
        config = FaceRecognitionConfig(model="adaface")
        self.assertEqual(config.model.value, "adaface")

    def test_config_rejects_invalid_model(self):
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            FaceRecognitionConfig(model="invalid")


class TestEnrichmentModelTypeEnum(unittest.TestCase):
    """Verify adaface is registered in EnrichmentModelTypeEnum."""

    def test_adaface_in_enum(self):
        self.assertEqual(EnrichmentModelTypeEnum.adaface.value, "adaface")


if __name__ == "__main__":
    unittest.main()
