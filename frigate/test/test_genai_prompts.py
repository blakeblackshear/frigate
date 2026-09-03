"""Tests for GenAI prompt builders."""

import unittest

from frigate.config.camera.review import ReviewResponseStyleEnum
from frigate.genai.prompts import (
    REVIEW_DESCRIPTION_FIELD_GUIDELINES,
    REVIEW_RESPONSE_STYLES,
    build_review_description_prompt,
    get_review_field_guidelines,
)


class TestReviewResponseStyle(unittest.TestCase):
    def _build_prompt(self, response_style: str = "default") -> str:
        review_data = {
            "camera": "Front Door",
            "start": "Monday, 09:30 AM",
            "duration": 25,
            "zones": [],
            "unified_objects": ["person"],
        }
        return build_review_description_prompt(
            review_data,
            [b"fake-image"],
            [],
            None,
            "activity context",
            response_style,
        )

    def test_default_style_leaves_prompt_unchanged(self):
        self.assertEqual(
            get_review_field_guidelines("default"),
            REVIEW_DESCRIPTION_FIELD_GUIDELINES,
        )
        self.assertEqual(self._build_prompt("default"), self._build_prompt())

    def test_unknown_style_leaves_prompt_unchanged(self):
        self.assertEqual(self._build_prompt("unknown"), self._build_prompt())

    def test_styles_replace_user_facing_field_guidance(self):
        default_prompt = self._build_prompt()
        for style, overrides in REVIEW_RESPONSE_STYLES.items():
            prompt = self._build_prompt(style)
            for field_name, guidance in overrides.items():
                self.assertIn(f"- `{field_name}`: {guidance}", prompt)
                self.assertNotIn(
                    REVIEW_DESCRIPTION_FIELD_GUIDELINES[field_name], prompt
                )
            # Everything outside the overridden guidance lines is unchanged
            self.assertEqual(
                [
                    line
                    for line in prompt.splitlines()
                    if not any(line.startswith(f"- `{f}`:") for f in overrides)
                ],
                [
                    line
                    for line in default_prompt.splitlines()
                    if not any(line.startswith(f"- `{f}`:") for f in overrides)
                ],
            )

    def test_styles_never_touch_reasoning_or_threat_fields(self):
        # observations is a reasoning scaffold and potential_threat_level is
        # scoring guidance; presets restyle only the user-facing fields.
        for overrides in REVIEW_RESPONSE_STYLES.values():
            self.assertTrue(
                set(overrides) <= {"scene", "title", "shortSummary"},
                f"unexpected override fields: {set(overrides)}",
            )

    def test_config_enum_matches_style_presets(self):
        enum_styles = {e.value for e in ReviewResponseStyleEnum}
        self.assertEqual(enum_styles, {"default", *REVIEW_RESPONSE_STYLES})

    def test_enum_value_selects_preset(self):
        prompt = self._build_prompt(ReviewResponseStyleEnum.natural)
        self.assertIn(
            REVIEW_RESPONSE_STYLES["natural"]["shortSummary"],
            prompt,
        )


if __name__ == "__main__":
    unittest.main()
