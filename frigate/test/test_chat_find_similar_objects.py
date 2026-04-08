"""Tests for the find_similar_objects chat tool."""

import unittest
from unittest.mock import MagicMock

from frigate.api.chat import (
    DESCRIPTION_WEIGHT,
    VISUAL_WEIGHT,
    _distance_to_score,
    _fuse_scores,
)
from frigate.embeddings.util import ZScoreNormalization


class TestDistanceToScore(unittest.TestCase):
    def test_lower_distance_gives_higher_score(self):
        stats = ZScoreNormalization()
        # Seed the stats with a small distribution so stddev > 0.
        stats._update([0.1, 0.2, 0.3, 0.4, 0.5])

        close_score = _distance_to_score(0.1, stats)
        far_score = _distance_to_score(0.5, stats)

        self.assertGreater(close_score, far_score)
        self.assertGreaterEqual(close_score, 0.0)
        self.assertLessEqual(close_score, 1.0)
        self.assertGreaterEqual(far_score, 0.0)
        self.assertLessEqual(far_score, 1.0)

    def test_uninitialized_stats_returns_neutral_score(self):
        stats = ZScoreNormalization()  # n == 0, stddev == 0
        self.assertEqual(_distance_to_score(0.3, stats), 0.5)


class TestFuseScores(unittest.TestCase):
    def test_weights_sum_to_one(self):
        self.assertAlmostEqual(VISUAL_WEIGHT + DESCRIPTION_WEIGHT, 1.0)

    def test_fuses_both_sides(self):
        fused = _fuse_scores(visual_score=0.8, description_score=0.4)
        expected = VISUAL_WEIGHT * 0.8 + DESCRIPTION_WEIGHT * 0.4
        self.assertAlmostEqual(fused, expected)

    def test_missing_description_uses_visual_only(self):
        fused = _fuse_scores(visual_score=0.7, description_score=None)
        self.assertAlmostEqual(fused, 0.7)

    def test_missing_visual_uses_description_only(self):
        fused = _fuse_scores(visual_score=None, description_score=0.6)
        self.assertAlmostEqual(fused, 0.6)

    def test_both_missing_returns_none(self):
        self.assertIsNone(_fuse_scores(visual_score=None, description_score=None))


import datetime
import os
import tempfile

from playhouse.sqlite_ext import SqliteExtDatabase

from frigate.api.chat import CANDIDATE_CAP, _build_similar_candidates_query
from frigate.models import Event


class TestBuildSimilarCandidatesQuery(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.tmp.close()
        self.db = SqliteExtDatabase(self.tmp.name)
        Event.bind(self.db, bind_refs=False, bind_backrefs=False)
        self.db.connect()
        self.db.create_tables([Event])

        # Minimal helper for creating events.
        def make_event(
            event_id,
            camera="driveway",
            label="car",
            sub_label=None,
            start=1_700_000_000,
            zones=None,
        ):
            Event.create(
                id=event_id,
                label=label,
                sub_label=sub_label,
                camera=camera,
                start_time=start,
                end_time=start + 10,
                top_score=0.9,
                score=0.9,
                false_positive=False,
                zones=zones or [],
                thumbnail="",
                has_clip=True,
                has_snapshot=True,
                region=[0, 0, 1, 1],
                box=[0, 0, 1, 1],
                area=1,
                retain_indefinitely=False,
                ratio=1.0,
                plus_id="",
                model_hash="",
                detector_type="",
                model_type="",
                data={},
            )

        self.make_event = make_event

    def tearDown(self):
        self.db.close()
        os.unlink(self.tmp.name)

    def test_excludes_anchor(self):
        self.make_event("anchor")
        self.make_event("other")
        ids = _build_similar_candidates_query(
            anchor_id="anchor",
            after=None,
            before=None,
            cameras=None,
            labels=["car"],
            sub_labels=None,
            zones=None,
        )
        self.assertEqual(ids, ["other"])

    def test_time_range_filters(self):
        self.make_event("in_range", start=1_700_000_500)
        self.make_event("too_early", start=1_699_999_000)
        self.make_event("too_late", start=1_700_001_000)
        ids = _build_similar_candidates_query(
            anchor_id="nonexistent",
            after=1_700_000_000,
            before=1_700_000_999,
            cameras=None,
            labels=["car"],
            sub_labels=None,
            zones=None,
        )
        self.assertEqual(ids, ["in_range"])

    def test_camera_filter(self):
        self.make_event("driveway_a", camera="driveway")
        self.make_event("porch_a", camera="porch")
        ids = _build_similar_candidates_query(
            anchor_id="nonexistent",
            after=None,
            before=None,
            cameras=["driveway"],
            labels=["car"],
            sub_labels=None,
            zones=None,
        )
        self.assertEqual(ids, ["driveway_a"])

    def test_label_filter(self):
        self.make_event("car_a", label="car")
        self.make_event("person_a", label="person")
        ids = _build_similar_candidates_query(
            anchor_id="nonexistent",
            after=None,
            before=None,
            cameras=None,
            labels=["car"],
            sub_labels=None,
            zones=None,
        )
        self.assertEqual(ids, ["car_a"])

    def test_zone_any_match(self):
        self.make_event("in_zone", zones=["driveway_zone"])
        self.make_event("other_zone", zones=["porch_zone"])
        ids = _build_similar_candidates_query(
            anchor_id="nonexistent",
            after=None,
            before=None,
            cameras=None,
            labels=["car"],
            sub_labels=None,
            zones=["driveway_zone"],
        )
        self.assertEqual(ids, ["in_zone"])

    def test_respects_candidate_cap(self):
        for i in range(CANDIDATE_CAP + 20):
            self.make_event(f"e{i:04d}", start=1_700_000_000 + i)
        ids = _build_similar_candidates_query(
            anchor_id="nonexistent",
            after=None,
            before=None,
            cameras=None,
            labels=["car"],
            sub_labels=None,
            zones=None,
        )
        self.assertEqual(len(ids), CANDIDATE_CAP)
        # Most recent first, so we should keep the latest CANDIDATE_CAP events.
        self.assertIn(f"e{CANDIDATE_CAP + 19:04d}", ids)
        self.assertNotIn("e0000", ids)


if __name__ == "__main__":
    unittest.main()
