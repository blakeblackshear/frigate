"""Enrichment rate/speed gauges must decay to 0 when the processor goes idle.

process_frame()/process_data() only run on object updates, so without an
explicit idle refresh the rate gauge (EventsPerSecond) and the inference-speed
gauge (an EMA that only changes on update) both hold their last value forever
when nothing is being processed, and the UI shows a stale inference time. The
maintainer calls refresh_idle_metrics() every loop; these tests exercise the
real override on each processor with a mock self so the heavy model init is
skipped.
"""

import sys
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

# TFLite is imported at module load by custom_classification
for _mod in (
    "tflite_runtime",
    "tflite_runtime.interpreter",
    "ai_edge_litert",
    "ai_edge_litert.interpreter",
):
    if _mod not in sys.modules:
        sys.modules[_mod] = MagicMock()

# isort: off
# Import order is load-bearing: the maintainer must be imported first so that it
# pulls in every processor module in the order that resolves the license-plate
# <-> embeddings circular import. Alphabetical sorting would import the mixin
# first and re-trigger the cycle, so import sorting is disabled for this block.
from frigate.embeddings.maintainer import EmbeddingMaintainer  # noqa: E402,F401
from frigate.data_processing.common.license_plate.mixin import (  # noqa: E402
    LicensePlateProcessingMixin,
)
from frigate.data_processing.post.api import PostProcessorApi  # noqa: E402
from frigate.data_processing.post.object_descriptions import (  # noqa: E402
    ObjectDescriptionProcessor,
)
from frigate.data_processing.post.review_descriptions import (  # noqa: E402
    ReviewDescriptionProcessor,
)
from frigate.data_processing.real_time.api import RealTimeProcessorApi  # noqa: E402
from frigate.data_processing.real_time.custom_classification import (  # noqa: E402
    CustomObjectClassificationProcessor,
    CustomStateClassificationProcessor,
)
from frigate.data_processing.real_time.face import FaceRealTimeProcessor  # noqa: E402

# isort: on


class TestIdleMetricsBaseDefault(unittest.TestCase):
    def test_base_defaults_are_noops(self):
        # A processor without gauges must not crash when refreshed.
        RealTimeProcessorApi.refresh_idle_metrics(MagicMock())
        PostProcessorApi.refresh_idle_metrics(MagicMock())


class TestFaceIdleMetrics(unittest.TestCase):
    def _make(self, eps):
        s = MagicMock()
        s.faces_per_second.eps.return_value = eps
        s.metrics.face_rec_fps = SimpleNamespace(value=99.0)
        s.metrics.face_rec_speed = SimpleNamespace(value=42.0)
        return s

    def test_zeros_speed_when_idle(self):
        s = self._make(0.0)
        FaceRealTimeProcessor.refresh_idle_metrics(s)
        self.assertEqual(s.metrics.face_rec_fps.value, 0.0)
        self.assertEqual(s.metrics.face_rec_speed.value, 0.0)

    def test_keeps_speed_when_active(self):
        s = self._make(3.0)
        FaceRealTimeProcessor.refresh_idle_metrics(s)
        self.assertEqual(s.metrics.face_rec_fps.value, 3.0)
        self.assertEqual(s.metrics.face_rec_speed.value, 42.0)  # untouched


class TestClassificationIdleMetrics(unittest.TestCase):
    def _make(self, eps):
        s = MagicMock()
        s.model_config.name = "brana"
        s.metrics.classification_cps = {"brana": SimpleNamespace(value=99.0)}
        s.metrics.classification_speeds = {"brana": SimpleNamespace(value=42.0)}
        s.classifications_per_second.eps.return_value = eps
        return s

    def test_state_zeros_speed_when_idle(self):
        s = self._make(0.0)
        CustomStateClassificationProcessor.refresh_idle_metrics(s)
        self.assertEqual(s.metrics.classification_cps["brana"].value, 0.0)
        self.assertEqual(s.metrics.classification_speeds["brana"].value, 0.0)

    def test_object_keeps_speed_when_active(self):
        s = self._make(2.0)
        CustomObjectClassificationProcessor.refresh_idle_metrics(s)
        self.assertEqual(s.metrics.classification_cps["brana"].value, 2.0)
        self.assertEqual(s.metrics.classification_speeds["brana"].value, 42.0)

    def test_unknown_model_is_ignored(self):
        s = MagicMock()
        s.model_config.name = "missing"
        s.metrics.classification_cps = {}
        s.metrics.classification_speeds = {}
        # must not raise
        CustomStateClassificationProcessor.refresh_idle_metrics(s)


class TestLicensePlateIdleMetrics(unittest.TestCase):
    def test_zeros_both_speeds_when_idle(self):
        s = MagicMock()
        s.plates_rec_second.eps.return_value = 0.0
        s.plates_det_second.eps.return_value = 0.0
        s.metrics.alpr_pps = SimpleNamespace(value=99.0)
        s.metrics.alpr_speed = SimpleNamespace(value=42.0)
        s.metrics.yolov9_lpr_pps = SimpleNamespace(value=99.0)
        s.metrics.yolov9_lpr_speed = SimpleNamespace(value=42.0)
        LicensePlateProcessingMixin.refresh_idle_metrics(s)
        self.assertEqual(s.metrics.alpr_pps.value, 0.0)
        self.assertEqual(s.metrics.alpr_speed.value, 0.0)
        self.assertEqual(s.metrics.yolov9_lpr_pps.value, 0.0)
        self.assertEqual(s.metrics.yolov9_lpr_speed.value, 0.0)


class TestDescriptionIdleMetrics(unittest.TestCase):
    def test_review_zeros_speed_when_idle(self):
        s = MagicMock()
        s.review_desc_dps.eps.return_value = 0.0
        s.metrics.review_desc_dps = SimpleNamespace(value=99.0)
        s.metrics.review_desc_speed = SimpleNamespace(value=42.0)
        ReviewDescriptionProcessor.refresh_idle_metrics(s)
        self.assertEqual(s.metrics.review_desc_dps.value, 0.0)
        self.assertEqual(s.metrics.review_desc_speed.value, 0.0)

    def test_object_keeps_speed_when_active(self):
        s = MagicMock()
        s.object_desc_dps.eps.return_value = 1.5
        s.metrics.object_desc_dps = SimpleNamespace(value=99.0)
        s.metrics.object_desc_speed = SimpleNamespace(value=42.0)
        ObjectDescriptionProcessor.refresh_idle_metrics(s)
        self.assertEqual(s.metrics.object_desc_dps.value, 1.5)
        self.assertEqual(s.metrics.object_desc_speed.value, 42.0)


if __name__ == "__main__":
    unittest.main()
