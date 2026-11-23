import unittest
from unittest.mock import patch

from frigate.config import FrigateConfig
from frigate.util.object_names import get_categorized_object_names


class TestCategorizedObjectNames(unittest.TestCase):
    def setUp(self):
        self.config = FrigateConfig(
            **{
                "mqtt": {"host": "mqtt"},
                "cameras": {
                    "front_door": {
                        "ffmpeg": {
                            "inputs": [
                                {
                                    "path": "rtsp://10.0.0.1:554/video",
                                    "roles": ["detect"],
                                }
                            ]
                        },
                        "detect": {"height": 1080, "width": 1920, "fps": 5},
                        "objects": {"track": ["person"]},
                    },
                    "yard": {
                        "ffmpeg": {
                            "inputs": [
                                {
                                    "path": "rtsp://10.0.0.2:554/video",
                                    "roles": ["detect"],
                                }
                            ]
                        },
                        "detect": {"height": 1080, "width": 1920, "fps": 5},
                        "objects": {"track": ["person", "dog"]},
                    },
                },
                "classification": {
                    "custom": {
                        "pets": {
                            "object_config": {
                                "objects": ["dog"],
                                "classification_type": "sub_label",
                            }
                        }
                    }
                },
            }
        )

    @patch(
        "frigate.util.object_names._get_classification_categories",
        return_value={"rex"},
    )
    def test_classification_categories_limited_to_tracked_objects(self, _categories):
        names = get_categorized_object_names(self.config, ["front_door"])
        self.assertNotIn("dog", names)

        self.assertNotIn("dog", get_categorized_object_names(self.config, []))

        names = get_categorized_object_names(self.config, ["yard"])
        self.assertEqual(names["dog"], ["rex"])


if __name__ == "__main__":
    unittest.main()
