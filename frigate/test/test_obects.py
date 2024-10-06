import unittest

from frigate.track.object_attribute import ObjectAttribute


class TestAttribute(unittest.TestCase):
    def test_overlapping_object_selection(self) -> None:
        attribute = ObjectAttribute(
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
