"""Tests for object classification example extraction."""

import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np

from frigate.util.classification import _extract_event_thumbnails


class TestExtractEventThumbnails(unittest.TestCase):
    def test_falls_back_past_missing_images_and_stops_at_target(self):
        events = [SimpleNamespace(id=f"event_{i}") for i in range(10)]
        missing = {"event_0", "event_1", "event_2"}
        image = np.zeros((32, 32, 3), dtype=np.uint8)

        with (
            tempfile.TemporaryDirectory() as tmpdir,
            patch(
                "frigate.util.classification._load_event_classification_crop",
                side_effect=lambda event: None if event.id in missing else image,
            ) as load,
        ):
            paths = _extract_event_thumbnails(events, tmpdir, target_count=4)

        self.assertEqual(len(paths), 4)
        self.assertEqual(load.call_count, 7)


if __name__ == "__main__":
    unittest.main()
