import unittest

import cv2
import numpy as np

from frigate.util.image import get_snapshot_bytes


class TestSnapshotBytes(unittest.TestCase):
    def snapshot_shape(self, height: int, crop: bool = False) -> tuple[int, int]:
        jpg, _ = get_snapshot_bytes(
            np.zeros((90, 160, 3), np.uint8),
            0.0,
            "jpg",
            crop=crop,
            height=height,
            label="person",
            box=(70, 35, 90, 55),
            score=None,
            area=None,
            attributes=None,
            color=(255, 255, 255),
        )
        image = cv2.imdecode(np.frombuffer(jpg, np.uint8), cv2.IMREAD_COLOR)
        return image.shape[:2]

    def test_height_capped_at_frame_height(self):
        self.assertEqual(self.snapshot_shape(45), (45, 80))
        self.assertEqual(self.snapshot_shape(5000), (90, 160))

    def test_crop_can_scale_up_to_frame_height(self):
        self.assertEqual(self.snapshot_shape(5000, crop=True)[0], 90)


if __name__ == "__main__":
    unittest.main()
