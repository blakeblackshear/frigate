"""Tests for pairing review sub labels with their verified objects."""

import unittest
from unittest.mock import MagicMock

from peewee import SqliteDatabase

from frigate.config import FrigateConfig
from frigate.data_processing.post.review_descriptions import (
    get_named_objects,
    run_analysis,
)
from frigate.models import Event

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


def unified_objects(
    review_data: dict, named_objects: list[tuple[str, str]] | None = None
) -> list[str]:
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
        ["amazon"],
        named_objects,
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


class TestRegeneratedSubLabels(unittest.TestCase):
    """Review items whose stored lists were rebuilt after a sub label edit."""

    def setUp(self):
        self.db = SqliteDatabase(":memory:")
        self.db.bind([Event])
        self.db.create_tables([Event])

    def tearDown(self):
        self.db.close()

    def _insert_event(
        self, id: str, label: str, sub_label: str | None, start_time: float
    ) -> None:
        Event.create(
            id=id,
            label=label,
            sub_label=sub_label,
            camera="front_door",
            start_time=start_time,
            end_time=start_time + 10,
            top_score=0.9,
            score=0.9,
            false_positive=False,
            zones=[],
            thumbnail="",
            has_clip=True,
            has_snapshot=True,
            region=[],
            box=[],
            area=0,
            retain_indefinitely=False,
            plus_id="",
            model_hash="",
            detector_type="cpu",
            model_type="ssd",
            data={},
        )

    def test_cleared_sub_label_does_not_move_to_another_object(self):
        self._insert_event("car1", "car", None, 1)
        self._insert_event("person1", "person", "Nick", 2)

        named = get_named_objects(["car1", "person1"], ["amazon"])
        objects = unified_objects(
            {
                "zones": [],
                "objects": ["car", "person-verified"],
                "verified_objects": ["car-verified", "person-verified"],
                "sub_labels": ["Nick"],
                "classification_state_changes": [],
            },
            named,
        )

        self.assertEqual(objects, ["Nick ← person", "car"])

    def test_repeated_name_is_kept_for_each_object(self):
        # sub_labels are deduplicated when rebuilt, which previously raised an
        # IndexError when the verified objects outnumbered them
        self._insert_event("person1", "person", "Nick", 1)
        self._insert_event("person2", "person", "Nick", 2)

        named = get_named_objects(["person1", "person2"], ["amazon"])
        objects = unified_objects(
            {
                "zones": [],
                "objects": ["person-verified", "person-verified"],
                "verified_objects": ["person-verified", "person-verified"],
                "sub_labels": ["Nick"],
                "classification_state_changes": [],
            },
            named,
        )

        self.assertEqual(objects, ["Nick ← person", "Nick ← person"])

    def test_attribute_sub_labels_are_not_names(self):
        self._insert_event("car1", "car", "amazon", 1)
        self._insert_event("person1", "person", "Nick", 2)
        self._insert_event("other", "person", "Bob", 3)

        self.assertEqual(
            get_named_objects(["car1", "person1"], ["amazon"]),
            [("person", "Nick")],
        )


if __name__ == "__main__":
    unittest.main()
