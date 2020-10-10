import cv2
import imutils
import numpy as np

class MotionDetector():
    def __init__(self, frame_shape, mask, resize_factor=4):
        self.frame_shape = frame_shape
        self.resize_factor = resize_factor
        self.motion_frame_size = (int(frame_shape[0]/resize_factor), int(frame_shape[1]/resize_factor))
        self.avg_frame = np.zeros(self.motion_frame_size, np.float)
        self.avg_delta = np.zeros(self.motion_frame_size, np.float)
        self.motion_frame_count = 0
        self.frame_counter = 0
        resized_mask = cv2.resize(mask, dsize=(self.motion_frame_size[1], self.motion_frame_size[0]), interpolation=cv2.INTER_LINEAR)
        self.mask = np.where(resized_mask==[0])

    def detect(self, frame):
        motion_boxes = []

        gray = frame[0:self.frame_shape[0], 0:self.frame_shape[1]]

        # resize frame
        resized_frame = cv2.resize(gray, dsize=(self.motion_frame_size[1], self.motion_frame_size[0]), interpolation=cv2.INTER_LINEAR)

        # convert to grayscale
        # resized_frame = cv2.cvtColor(resized_frame, cv2.COLOR_BGR2GRAY)

        # mask frame
        resized_frame[self.mask] = [255]

        # it takes ~30 frames to establish a baseline
        # dont bother looking for motion
        if self.frame_counter < 30:
            self.frame_counter += 1
        else:
            # compare to average
            frameDelta = cv2.absdiff(resized_frame, cv2.convertScaleAbs(self.avg_frame))

            # compute the average delta over the past few frames
            # the alpha value can be modified to configure how sensitive the motion detection is.
            # higher values mean the current frame impacts the delta a lot, and a single raindrop may
            # register as motion, too low and a fast moving person wont be detected as motion
            # this also assumes that a person is in the same location across more than a single frame
            cv2.accumulateWeighted(frameDelta, self.avg_delta, 0.2)

            # compute the threshold image for the current frame
            current_thresh = cv2.threshold(frameDelta, 25, 255, cv2.THRESH_BINARY)[1]

            # black out everything in the avg_delta where there isnt motion in the current frame
            avg_delta_image = cv2.convertScaleAbs(self.avg_delta)
            avg_delta_image[np.where(current_thresh==[0])] = [0]

            # then look for deltas above the threshold, but only in areas where there is a delta
            # in the current frame. this prevents deltas from previous frames from being included
            thresh = cv2.threshold(avg_delta_image, 25, 255, cv2.THRESH_BINARY)[1]

            # dilate the thresholded image to fill in holes, then find contours
            # on thresholded image
            thresh = cv2.dilate(thresh, None, iterations=2)
            cnts = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cnts = imutils.grab_contours(cnts)

            # loop over the contours
            for c in cnts:
                # if the contour is big enough, count it as motion
                contour_area = cv2.contourArea(c)
                if contour_area > 100:
                    x, y, w, h = cv2.boundingRect(c)
                    motion_boxes.append((x*self.resize_factor, y*self.resize_factor, (x+w)*self.resize_factor, (y+h)*self.resize_factor))
        
        if len(motion_boxes) > 0:
            self.motion_frame_count += 1
            # TODO: this really depends on FPS
            if self.motion_frame_count >= 10:
                # only average in the current frame if the difference persists for at least 3 frames
                cv2.accumulateWeighted(resized_frame, self.avg_frame, 0.2)
        else:
            # when no motion, just keep averaging the frames together
            cv2.accumulateWeighted(resized_frame, self.avg_frame, 0.2)
            self.motion_frame_count = 0

        return motion_boxes