import cv2
import numpy as np
from unittest import TestCase, main
from frigate.util import copy_yuv_to_position


class TestCopyYuvToPosition(TestCase):
    def setUp(self):
        self.source_frame_bgr = np.zeros((400, 800, 3), np.uint8)
        self.source_frame_bgr[:] = (0, 0, 255)
        self.source_yuv_frame = cv2.cvtColor(
            self.source_frame_bgr, cv2.COLOR_BGR2YUV_I420
        )

        self.dest_frame_bgr = np.zeros((400, 800, 3), np.uint8)
        self.dest_frame_bgr[:] = (112, 202, 50)
        self.dest_frame_bgr[100:300, 200:600] = (255, 0, 0)
        self.dest_yuv_frame = cv2.cvtColor(self.dest_frame_bgr, cv2.COLOR_BGR2YUV_I420)

    def test_copy_yuv_to_position(self):
        copy_yuv_to_position(1, self.dest_yuv_frame, 3)
        # cv2.imwrite(f"source_frame_yuv.jpg", self.source_yuv_frame)
        # cv2.imwrite(f"dest_frame_yuv.jpg", self.dest_yuv_frame)


if __name__ == "__main__":
    main(verbosity=2)
