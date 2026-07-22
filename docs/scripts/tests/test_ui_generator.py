"""Tests for focused Frigate configuration mock generation."""

import sys
import types
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    import yaml  # noqa: F401
except ModuleNotFoundError:
    yaml_stub = types.ModuleType("yaml")
    yaml_stub.YAMLError = ValueError
    yaml_stub.safe_load = lambda _value: {}
    sys.modules["yaml"] = yaml_stub

from lib.ui_generator import generate_mock_content
from lib.yaml_extractor import YamlBlock


def make_block(parsed: dict, section: str, camera: bool = False) -> YamlBlock:
    """Create a parsed YAML block for generator tests."""
    return YamlBlock(
        raw="",
        parsed=parsed,
        line_start=1,
        line_end=1,
        highlight=None,
        has_comments=False,
        inside_config_tabs=False,
        section_key=section,
        is_camera_level=camera,
        camera_name="front_door" if camera else None,
        config_keys=list(parsed),
    )


class TestGenerateMockContent(unittest.TestCase):
    def test_generates_focused_global_section(self):
        content = generate_mock_content(
            make_block({"motion": {"threshold": 30}}, "motion"),
            {},
            {},
            {},
        )

        self.assertIn('section="motion"', content)
        self.assertIn('level="global"', content)
        self.assertIn('fields={["threshold"]}', content)
        self.assertIn('values={{"threshold": 30}}', content)
        self.assertIn('focus="threshold"', content)

    def test_unwraps_camera_and_omits_hidden_fields(self):
        content = generate_mock_content(
            make_block(
                {
                    "cameras": {
                        "front_door": {
                            "motion": {
                                "threshold": 20,
                                "raw_mask": "ignored",
                            }
                        }
                    }
                },
                "motion",
                camera=True,
            ),
            {},
            {},
            {"motion": {"hiddenFields": ["raw_mask"]}},
        )

        self.assertIn('level="camera"', content)
        self.assertIn('fields={["threshold"]}', content)
        self.assertNotIn("raw_mask", content)

    def test_generates_steps_for_multiple_sections(self):
        content = generate_mock_content(
            make_block(
                {
                    "record": {"enabled": True},
                    "snapshots": {"enabled": True},
                },
                "record",
            ),
            {},
            {},
            {},
        )

        self.assertIn("steps={", content)
        self.assertIn('"section": "record"', content)
        self.assertIn('"section": "snapshots"', content)


if __name__ == "__main__":
    unittest.main()
