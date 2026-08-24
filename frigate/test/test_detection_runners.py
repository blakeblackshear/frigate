"""Tests for ONNX Runtime session option selection."""

import unittest

import onnxruntime as ort

from frigate.detectors.detection_runners import get_ort_session_options
from frigate.detectors.detector_config import ModelTypeEnum
from frigate.embeddings.types import EnrichmentModelTypeEnum


class TestGetOrtSessionOptions(unittest.TestCase):
    def test_jina_v2_uses_extended(self):
        """jina-clip-v2 returns an identical vector for every image on the CUDA
        execution provider at anything below EXTENDED."""
        options = get_ort_session_options(EnrichmentModelTypeEnum.jina_v2.value)

        self.assertIsNotNone(options)
        self.assertEqual(
            options.graph_optimization_level,
            ort.GraphOptimizationLevel.ORT_ENABLE_EXTENDED,
        )

    def test_jina_v1_uses_basic(self):
        options = get_ort_session_options(EnrichmentModelTypeEnum.jina_v1.value)

        self.assertIsNotNone(options)
        self.assertEqual(
            options.graph_optimization_level,
            ort.GraphOptimizationLevel.ORT_ENABLE_BASIC,
        )

    def test_other_models_use_defaults(self):
        for model_type in [
            None,
            EnrichmentModelTypeEnum.paddleocr.value,
            EnrichmentModelTypeEnum.arcface.value,
            ModelTypeEnum.rfdetr.value,
        ]:
            with self.subTest(model_type=model_type):
                self.assertIsNone(get_ort_session_options(model_type))
