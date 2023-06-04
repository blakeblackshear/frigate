from typing import Tuple

import cv2
import imutils
import numpy as np

from frigate.config import MotionConfig
from frigate.motion import MotionDetector


class CNTMotionDetector(MotionDetector):
    def __init__(
        self,
        frame_shape: Tuple[int, int, int],
        config: MotionConfig,
        fps: int,
        improve_contrast,
        threshold,
        contour_area,
    ):
        self.frame_shape = frame_shape
        self.threshold = threshold
        self.contour_area = contour_area
        self.improve_contrast = improve_contrast
        self.resize_factor = frame_shape[0] / config.frame_height
        self.motion_frame_size = (
            config.frame_height,
            config.frame_height * frame_shape[1] // frame_shape[0],
        )
        resized_mask = cv2.resize(
            config.mask,
            dsize=(self.motion_frame_size[1], self.motion_frame_size[0]),
            interpolation=cv2.INTER_LINEAR,
        )
        self.blur_kernel = (
            3,  # int(0.05 * self.motion_frame_size[0]),
            3,  # int(0.05 * self.motion_frame_size[0]),
        )

        self.mask = np.where(resized_mask == [0])
        # createBackgroundSubtractorCNT(int minPixelStability = 15,
        #                       bool useHistory = true,
        #                       int maxPixelStability = 15*60,
        #                       bool isParallel = true);
        self.bg_subtractor = cv2.bgsegm.createBackgroundSubtractorCNT(
            fps, True, fps * 60, True
        )
        self.save_images = False
        self.frame_counter = 0

    def detect(self, frame):
        motion_boxes = []
        gray = frame[0 : self.frame_shape[0], 0 : self.frame_shape[1]]
        # resize frame
        resized_frame = cv2.resize(
            gray,
            dsize=(self.motion_frame_size[1], self.motion_frame_size[0]),
            interpolation=cv2.INTER_LINEAR,
        )
        if self.improve_contrast.value:
            resized_frame = cv2.equalizeHist(resized_frame)
        blurred_frame = cv2.GaussianBlur(
            resized_frame, self.blur_kernel, cv2.BORDER_DEFAULT
        )
        # mask frame
        blurred_frame[self.mask] = [255]
        fg = self.bg_subtractor.apply(blurred_frame)
        thresh = cv2.threshold(fg, self.threshold.value, 255, cv2.THRESH_BINARY)[1]

        # dilate the thresholded image to fill in holes, then find contours
        # on thresholded image
        cnts = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)

        # loop over the contours
        for c in cnts:
            # if the contour is big enough, count it as motion
            contour_area = cv2.contourArea(c)
            if contour_area > self.contour_area.value:
                x, y, w, h = cv2.boundingRect(c)
                motion_boxes.append(
                    (
                        int(x * self.resize_factor),
                        int(y * self.resize_factor),
                        int((x + w) * self.resize_factor),
                        int((y + h) * self.resize_factor),
                    )
                )

        if self.save_images:
            self.frame_counter += 1
            # print("--------")
            # print(self.frame_counter)
            thresh_boxes = cv2.cvtColor(fg, cv2.COLOR_GRAY2BGR)
            for c in cnts:
                contour_area = cv2.contourArea(c)
                if contour_area > self.contour_area.value:
                    x, y, w, h = cv2.boundingRect(c)
                    cv2.rectangle(
                        thresh_boxes,
                        (x, y),
                        (x + w, y + h),
                        (0, 0, 255),
                        2,
                    )
            # print("--------")
            image_row_1 = cv2.hconcat(
                [
                    cv2.cvtColor(fg, cv2.COLOR_GRAY2BGR),
                    cv2.cvtColor(
                        self.bg_subtractor.getBackgroundImage(), cv2.COLOR_GRAY2BGR
                    ),
                ]
            )
            image_row_2 = cv2.hconcat(
                [cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR), thresh_boxes]
            )
            combined_image = cv2.vconcat([image_row_1, image_row_2])
            cv2.imwrite(f"debug/frames/motion-{self.frame_counter}.jpg", combined_image)
        return motion_boxes
