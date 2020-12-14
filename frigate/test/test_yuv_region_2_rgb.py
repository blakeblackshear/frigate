import cv2
import numpy as np
from unittest import TestCase, main
from frigate.util import yuv_region_2_rgb

class TestYuvRegion2RGB(TestCase):
    def setUp(self):
        self.bgr_frame = np.zeros((100, 200, 3), np.uint8)
        self.bgr_frame[:] = (0, 0, 255)
        self.bgr_frame[5:55, 5:55] = (255,0,0)
        # cv2.imwrite(f"bgr_frame.jpg", self.bgr_frame)
        self.yuv_frame = cv2.cvtColor(self.bgr_frame, cv2.COLOR_BGR2YUV_I420)

    def test_crop_yuv(self):
        cropped = yuv_region_2_rgb(self.yuv_frame, (10,10,50,50))
        # ensure the upper left pixel is blue
        assert(np.all(cropped[0, 0] == [0, 0, 255]))

    def test_crop_yuv_out_of_bounds(self):
        cropped = yuv_region_2_rgb(self.yuv_frame, (0,0,200,200))
        # cv2.imwrite(f"cropped.jpg", cv2.cvtColor(cropped, cv2.COLOR_RGB2BGR))
        # ensure the upper left pixel is red
        # the yuv conversion has some noise
        assert(np.all(cropped[0, 0] == [255, 1, 0]))
        # ensure the bottom right is black
        assert(np.all(cropped[199, 199] == [0, 0, 0]))

    def test_crop_yuv_portrait(self):
        bgr_frame = np.zeros((1920, 1080, 3), np.uint8)
        bgr_frame[:] = (0, 0, 255)
        bgr_frame[5:55, 5:55] = (255,0,0)
        # cv2.imwrite(f"bgr_frame.jpg", self.bgr_frame)
        yuv_frame = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2YUV_I420)

        cropped = yuv_region_2_rgb(yuv_frame, (0, 852, 648, 1500))
        # cv2.imwrite(f"cropped.jpg", cv2.cvtColor(cropped, cv2.COLOR_RGB2BGR))

if __name__ == '__main__':
    main(verbosity=2)