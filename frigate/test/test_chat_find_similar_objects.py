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


if __name__ == "__main__":
    unittest.main()
