"""Check model acceptance gates without a GPU or Frigate dependencies."""

import unittest

import numpy as np
from qualify_model import compare_detections


def detections(*rows):
    result = np.zeros((20, 6), dtype=np.float32)
    if rows:
        result[: len(rows)] = rows
    return result


CAR = [2, 0.9, 0.1, 0.1, 0.5, 0.5]
PERSON = [0, 0.8, 0.3, 0.3, 0.6, 0.6]


class TestDetectionComparison(unittest.TestCase):
    def test_rank_permutation_is_not_a_detection_difference(self):
        result = compare_detections(detections(CAR, PERSON), detections(PERSON, CAR))
        self.assertTrue(result["passed"])
        self.assertEqual(len(result["matches"]), 2)

    def test_missing_confident_detection_fails(self):
        self.assertFalse(compare_detections(detections(CAR), detections())["passed"])

    def test_new_confident_detection_fails(self):
        self.assertFalse(compare_detections(detections(), detections(CAR))["passed"])

    def test_class_or_box_change_fails(self):
        for changed in ([1, *CAR[1:]], [2, 0.9, 0.2, 0.2, 0.7, 0.7]):
            with self.subTest(changed=changed):
                self.assertFalse(
                    compare_detections(detections(CAR), detections(changed))["passed"]
                )

    def test_borderline_detection_is_reported(self):
        row = [2, 0.41, *CAR[2:]]
        result = compare_detections(detections(row), detections())
        self.assertTrue(result["passed"])
        self.assertEqual(result["borderline_reference_count"], 1)

    def test_borderline_match_cannot_hide_confident_score_drift(self):
        row = [2, 0.41, *CAR[2:]]
        self.assertFalse(compare_detections(detections(row), detections(CAR))["passed"])

    def test_one_detection_cannot_match_two_reference_boxes(self):
        self.assertFalse(
            compare_detections(detections(CAR, CAR), detections(CAR))["passed"]
        )

    def test_non_finite_output_is_rejected(self):
        row = detections(CAR)
        row[0, 1] = np.nan
        with self.assertRaisesRegex(ValueError, "Non-finite"):
            compare_detections(detections(CAR), row)


if __name__ == "__main__":
    unittest.main()
