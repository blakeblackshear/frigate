"""Tests for GenAI prompt builders."""

import unittest

from frigate.config.camera.review import ReviewResponseStyleEnum
from frigate.genai.prompts import (
    REVIEW_DESCRIPTION_FIELD_GUIDELINES,
    REVIEW_RESPONSE_STYLES,
    build_review_description_prompt,
    build_review_description_response_format,
    build_review_summary_prompt,
    get_review_field_guidelines,
)


class TestReviewDescriptionResponseFormat(unittest.TestCase):
    def _schema(self, concerns: list[str]) -> dict:
        response_format = build_review_description_response_format(concerns)
        self.assertTrue(response_format["json_schema"]["strict"])
        return response_format["json_schema"]["schema"]

    def test_every_property_is_required_for_strict_mode(self):
        for concerns in ([], ["a person loitering near the gate"]):
            with self.subTest(concerns=concerns):
                schema = self._schema(concerns)
                self.assertEqual(set(schema["properties"]), set(schema["required"]))

    def test_time_is_never_requested(self):
        schema = self._schema(["a person loitering near the gate"])
        self.assertNotIn("time", schema["properties"])
        self.assertNotIn("time", schema["required"])

    def test_concerns_omitted_when_not_configured(self):
        schema = self._schema([])
        self.assertNotIn("other_concerns", schema["properties"])
        self.assertNotIn("other_concerns", schema["required"])

    def test_concerns_requested_as_plain_list_when_configured(self):
        schema = self._schema(["a person loitering near the gate"])
        concerns = schema["properties"]["other_concerns"]
        self.assertEqual(concerns["type"], "array")
        self.assertEqual(concerns["items"], {"type": "string"})
        self.assertNotIn("anyOf", concerns)
        self.assertNotIn("default", concerns)

    def test_schema_is_not_shared_between_calls(self):
        self._schema(["a person loitering near the gate"])
        self.assertNotIn("other_concerns", self._schema([])["properties"])


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

    def test_every_style_states_length_and_name_rules(self):
        # The schema caps these fields and grammar-constrained providers cut
        # text off at the cap, and models only reliably use names when each
        # field asks for them.
        for style in ["default", *REVIEW_RESPONSE_STYLES]:
            fields = get_review_field_guidelines(style)
            self.assertIn("no more than five sentences", fields["scene"])
            self.assertIn("one", fields["shortSummary"])
            self.assertIn("sentence", fields["shortSummary"])

            for field_name in ("scene", "title", "shortSummary"):
                self.assertIn("always use their name", fields[field_name])

    def test_config_enum_matches_style_presets(self):
        enum_styles = {e.value for e in ReviewResponseStyleEnum}
        self.assertEqual(enum_styles, {"default", *REVIEW_RESPONSE_STYLES})

    def test_enum_value_selects_preset(self):
        prompt = self._build_prompt(ReviewResponseStyleEnum.natural)
        self.assertIn(
            REVIEW_RESPONSE_STYLES["natural"]["shortSummary"],
            prompt,
        )


class TestClassificationStateChanges(unittest.TestCase):
    def _build_prompt(self, **extra) -> str:
        review_data = {
            "camera": "Front Door",
            "start": "Monday, 09:30 AM",
            "duration": 25,
            "zones": [],
            "unified_objects": ["person"],
            **extra,
        }
        return build_review_description_prompt(
            review_data, [b"fake-image"], [], None, "activity context"
        )

    def test_no_changes_leaves_prompt_unchanged(self):
        self.assertEqual(
            self._build_prompt(classification_state_changes=[]),
            self._build_prompt(),
        )
        self.assertNotIn("## State Changes", self._build_prompt())

    def test_changes_are_listed_before_objects(self):
        change = "front gate changed from closed to open, 12s into the activity"
        prompt = self._build_prompt(classification_state_changes=[change])
        self.assertIn(f"\n- {change}\n\n## Objects in Scene", prompt)
        self.assertLess(
            prompt.index("## Sequence Details"), prompt.index("## State Changes")
        )

    def test_summary_describes_state_changes_only_when_present(self):
        event = {"title": "Person at door", "camera": "Front Door", "context": []}
        without = build_review_summary_prompt(0, 3600, [event], None)
        self.assertNotIn('"state_changes"', without)

        context_event = {
            **event,
            "context": [
                {"camera": "Driveway", "state_changes": ["gate changed from a to b"]}
            ],
        }
        with_changes = build_review_summary_prompt(0, 3600, [context_event], None)
        self.assertIn('- "state_changes"', with_changes)


if __name__ == "__main__":
    unittest.main()
