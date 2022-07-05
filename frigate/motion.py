import cv2
import imutils
import numpy as np
from frigate.config import MotionConfig


class MotionDetector:
    def __init__(
        self,
        frame_shape,
        config: MotionConfig,
        improve_contrast_enabled,
        motion_threshold,
        motion_contour_area,
    ):
        self.config = config
        self.frame_shape = frame_shape
        self.resize_factor = frame_shape[0] / config.frame_height
        self.motion_frame_size = (
            config.frame_height,
            config.frame_height * frame_shape[1] // frame_shape[0],
        )
        self.avg_frame = np.zeros(self.motion_frame_size, np.float)
        self.avg_delta = np.zeros(self.motion_frame_size, np.float)
        self.motion_frame_count = 0
        self.frame_counter = 0
        resized_mask = cv2.resize(
            config.mask,
            dsize=(self.motion_frame_size[1], self.motion_frame_size[0]),
            interpolation=cv2.INTER_LINEAR,
        )
        self.mask = np.where(resized_mask == [0])
        self.save_images = False
        self.improve_contrast = improve_contrast_enabled
        self.threshold = motion_threshold
        self.contour_area = motion_contour_area

    def detect(self, frame):
        motion_boxes = []

        gray = frame[0 : self.frame_shape[0], 0 : self.frame_shape[1]]

        # resize frame
        resized_frame = cv2.resize(
            gray,
            dsize=(self.motion_frame_size[1], self.motion_frame_size[0]),
            interpolation=cv2.INTER_LINEAR,
        )

        # Improve contrast
        if self.improve_contrast.value:
            minval = np.percentile(resized_frame, 4)
            maxval = np.percentile(resized_frame, 96)
            # don't adjust if the image is a single color
            if minval < maxval:
                resized_frame = np.clip(resized_frame, minval, maxval)
                resized_frame = (
                    ((resized_frame - minval) / (maxval - minval)) * 255
                ).astype(np.uint8)

        # mask frame
        resized_frame[self.mask] = [255]

        # it takes ~30 frames to establish a baseline
        # dont bother looking for motion
        if self.frame_counter < 30:
            self.frame_counter += 1
        else:
            if self.save_images:
                self.frame_counter += 1
            # compare to average
            frameDelta = cv2.absdiff(resized_frame, cv2.convertScaleAbs(self.avg_frame))

            # compute the average delta over the past few frames
            # higher values mean the current frame impacts the delta a lot, and a single raindrop may
            # register as motion, too low and a fast moving person wont be detected as motion
            cv2.accumulateWeighted(frameDelta, self.avg_delta, self.config.delta_alpha)

            # compute the threshold image for the current frame
            current_thresh = cv2.threshold(
                frameDelta, self.threshold.value, 255, cv2.THRESH_BINARY
            )[1]

            # black out everything in the avg_delta where there isnt motion in the current frame
            avg_delta_image = cv2.convertScaleAbs(self.avg_delta)
            avg_delta_image = cv2.bitwise_and(avg_delta_image, current_thresh)

            # then look for deltas above the threshold, but only in areas where there is a delta
            # in the current frame. this prevents deltas from previous frames from being included
            thresh = cv2.threshold(
                avg_delta_image, self.threshold.value, 255, cv2.THRESH_BINARY
            )[1]

            # dilate the thresholded image to fill in holes, then find contours
            # on thresholded image
            thresh_dilated = cv2.dilate(thresh, None, iterations=2)
            cnts = cv2.findContours(
                thresh_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
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
                thresh_dilated = cv2.cvtColor(thresh_dilated, cv2.COLOR_GRAY2BGR)
                # print("--------")
                # print(self.frame_counter)
                for c in cnts:
                    contour_area = cv2.contourArea(c)
                    if contour_area > self.contour_area.value:
                        x, y, w, h = cv2.boundingRect(c)
                        cv2.rectangle(
                            thresh_dilated,
                            (x, y),
                            (x + w, y + h),
                            (0, 0, 255),
                            2,
                        )
                # print("--------")
                image_row_1 = cv2.hconcat(
                    [
                        cv2.cvtColor(frameDelta, cv2.COLOR_GRAY2BGR),
                        cv2.cvtColor(avg_delta_image, cv2.COLOR_GRAY2BGR),
                    ]
                )
                image_row_2 = cv2.hconcat(
                    [cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR), thresh_dilated]
                )
                combined_image = cv2.vconcat([image_row_1, image_row_2])
                cv2.imwrite(f"motion/motion-{self.frame_counter}.jpg", combined_image)

        if len(motion_boxes) > 0:
            self.motion_frame_count += 1
            if self.motion_frame_count >= 10:
                # only average in the current frame if the difference persists for a bit
                cv2.accumulateWeighted(
                    resized_frame, self.avg_frame, self.config.frame_alpha
                )
        else:
            # when no motion, just keep averaging the frames together
            cv2.accumulateWeighted(
                resized_frame, self.avg_frame, self.config.frame_alpha
            )
            self.motion_frame_count = 0

        return motion_boxes
