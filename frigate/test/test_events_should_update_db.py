"""When tracked object updates are written to the database."""

import unittest
from typing import Any

from frigate.events.maintainer import should_update_db


def _event(**overrides: Any) -> dict[str, Any]:
    return {
        "end_time": None,
        "has_clip": False,
        "has_snapshot": True,
        "top_score": 0.8,
        "entered_zones": ["porch"],
        "average_estimated_speed": 0,
        "velocity_angle": 0,
        "recognized_license_plate": None,
        "path_data": [],
        "max_severity": None,
        **overrides,
    }


class TestShouldUpdateDb(unittest.TestCase):
    def test_unchanged_saved_event_is_not_updated(self):
        self.assertFalse(should_update_db(_event(), _event()))

    def test_max_severity_change_updates_saved_event(self):
        self.assertTrue(should_update_db(_event(), _event(max_severity="alert")))

    def test_max_severity_change_ignored_when_not_saved(self):
        self.assertFalse(
            should_update_db(
                _event(has_snapshot=False),
                _event(has_snapshot=False, max_severity="alert"),
            )
        )


if __name__ == "__main__":
    unittest.main()
