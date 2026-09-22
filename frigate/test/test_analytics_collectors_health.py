"""Tests for the health collector."""

import unittest

from frigate.analytics.collectors import health
from frigate.test.analytics_helpers import make_context


class TestHealthCollector(unittest.TestCase):
    def test_collects_uptime_cpu_timings_and_notice_deltas(self):
        stats = {
            "service": {"uptime": 7300, "retention_unmet": True},
            "cpu_usages": {"frigate.full_system": {"cpu": "23.6", "mem": "40"}},
            "embeddings": {
                "face_recognition_speed": 41.234,
                "text_embedding_speed": 0,
                "devices": {},
            },
        }
        notice_stats = [
            {
                "kind": "detector_stuck",
                "occurrences": 5,
                "dismissals": 1,
                "reported_occurrences": 3,
                "reported_dismissals": 1,
            },
            {
                "kind": "shm_too_low",
                "occurrences": 2,
                "dismissals": 0,
                "reported_occurrences": 2,
                "reported_dismissals": 0,
            },
            {
                "kind": "update_available",
                "occurrences": 4,
                "dismissals": 0,
                "reported_occurrences": 0,
                "reported_dismissals": 0,
            },
        ]

        section = health.collect(make_context(stats=stats, notice_stats=notice_stats))

        self.assertEqual(section.uptime_hours, 2)
        self.assertEqual(section.cpu_percent, 24)
        self.assertEqual(section.enrichment_ms, {"face": 41.23})
        self.assertTrue(section.retention_unmet)
        self.assertEqual(
            {
                kind: (c.occurrences, c.dismissals)
                for kind, c in section.notices.items()
            },
            {"detector_stuck": (2, 0)},
        )

    def test_missing_stats_give_zeros(self):
        section = health.collect(make_context())

        self.assertEqual(
            (section.uptime_hours, section.cpu_percent, section.enrichment_ms),
            (0, 0, {}),
        )
        self.assertEqual(section.notices, {})
