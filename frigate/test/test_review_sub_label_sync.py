"""Tests for pairing review sub labels with their verified objects."""

import unittest
from unittest.mock import MagicMock

from frigate.config import FrigateConfig
from frigate.data_processing.post.review_descriptions import run_analysis

CONFIG = """
mqtt:
  enabled: False
cameras:
  front_door:
    ffmpeg:
      inputs:
        - path: rtsp://10.0.0.1:554/video
          roles:
            - detect
    detect:
      width: 1920
      height: 1080
      fps: 5
"""


def unified_objects(review_data: dict) -> list[str]:
    """Run the review analysis and return the objects sent to the GenAI client."""
    camera_config = FrigateConfig.parse_yaml(CONFIG).cameras["front_door"]
    client = MagicMock()
    client.generate_review_description.return_value = None
    run_analysis(
        MagicMock(),
        client,
        MagicMock(),
        camera_config,
        {"id": "review1", "start_time": 0, "end_time": 10, "data": review_data},
        [],
        [],
        camera_config.review.genai,
        ["car", "person"],
        [],
    )
    return client.generate_review_description.call_args.args[0]["unified_objects"]


class TestRunAnalysisSubLabels(unittest.TestCase):
    def test_verified_objects_are_named_by_their_sub_label(self):
        objects = unified_objects(
            {
                "zones": [],
                "objects": ["person-verified", "car"],
                "verified_objects": ["person-verified"],
                "sub_labels": ["nick_m"],
                "classification_state_changes": [],
            }
        )

        self.assertEqual(objects, ["Nick M ← person", "car"])

    def test_missing_sub_label_falls_back_to_object_type(self):
        # clearing a sub label on an ended review item leaves verified_objects
        # stale, which previously raised an IndexError on regenerate
        objects = unified_objects(
            {
                "zones": [],
                "objects": ["person-verified"],
                "verified_objects": ["person-verified", "person-verified"],
                "sub_labels": ["Nick"],
                "classification_state_changes": [],
            }
        )

        self.assertEqual(objects, ["Nick ← person", "person"])


if __name__ == "__main__":
    unittest.main()
