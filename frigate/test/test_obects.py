import random
import unittest

import numpy as np

from frigate.track.tracked_object import TrackedObjectAttribute
from frigate.util.object import average_boxes


class TestBoxStatistics(unittest.TestCase):
    def test_average_boxes_matches_numpy(self) -> None:
        rng = random.Random(0)
        for _ in range(5000):
            boxes = [
                [rng.randint(0, 4000) for _ in range(4)]
                for _ in range(rng.randint(1, 10))
            ]
            expected = [float(np.mean([b[i] for b in boxes])) for i in range(4)]
            self.assertEqual(average_boxes(boxes), expected)


class TestAttribute(unittest.TestCase):
    def test_overlapping_object_selection(self) -> None:
        attribute = TrackedObjectAttribute(
            (
                "amazon",
                0.80078125,
                (847, 242, 883, 255),
                468,
                2.769230769230769,
                (702, 134, 1050, 482),
            )
        )
        objects = [
            {
                "label": "car",
                "score": 0.98828125,
                "box": (728, 223, 1266, 719),
                "area": 266848,
                "ratio": 1.0846774193548387,
                "region": (349, 0, 1397, 1048),
                "frame_time": 1727785394.498972,
                "centroid": (997, 471),
                "id": "1727785349.150633-408hal",
                "start_time": 1727785349.150633,
                "motionless_count": 362,
                "position_changes": 0,
                "score_history": [0.98828125, 0.95703125, 0.98828125, 0.98828125],
            },
            {
                "label": "person",
                "score": 0.76953125,
                "box": (826, 172, 939, 417),
                "area": 27685,
                "ratio": 0.46122448979591835,
                "region": (702, 134, 1050, 482),
                "frame_time": 1727785394.498972,
                "centroid": (882, 294),
                "id": "1727785390.499768-9fbhem",
                "start_time": 1727785390.499768,
                "motionless_count": 2,
                "position_changes": 1,
                "score_history": [0.8828125, 0.83984375, 0.91796875, 0.94140625],
            },
        ]
        assert attribute.find_best_object(objects) == "1727785390.499768-9fbhem"
