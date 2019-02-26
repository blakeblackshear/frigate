import datetime
import numpy as np
import cv2
import imutils
from . util import tonumpyarray

# do the actual motion detection
def detect_motion(shared_arr, shared_frame_time, frame_lock, frame_ready, motion_detected, motion_changed,
                  frame_shape, region_size, region_x_offset, region_y_offset, min_motion_area, mask, debug):
    # shape shared input array into frame for processing
    arr = tonumpyarray(shared_arr).reshape(frame_shape)

    avg_frame = None
    avg_delta = None
    frame_time = 0.0
    motion_frames = 0
    while True:
        now = datetime.datetime.now().timestamp()
        
        with frame_ready:
            # if there isnt a frame ready for processing or it is old, wait for a signal
            if shared_frame_time.value == frame_time or (now - shared_frame_time.value) > 0.5:
                frame_ready.wait()
        
        # lock and make a copy of the cropped frame
        with frame_lock: 
            cropped_frame = arr[region_y_offset:region_y_offset+region_size, region_x_offset:region_x_offset+region_size].copy().astype('uint8')
            frame_time = shared_frame_time.value

        # convert to grayscale
        gray = cv2.cvtColor(cropped_frame, cv2.COLOR_BGR2GRAY)

        # apply image mask to remove areas from motion detection
        gray[mask] = [255]

        # apply gaussian blur
        gray = cv2.GaussianBlur(gray, (21, 21), 0)

        if avg_frame is None:
            avg_frame = gray.copy().astype("float")
            continue
        
        # look at the delta from the avg_frame
        frameDelta = cv2.absdiff(gray, cv2.convertScaleAbs(avg_frame))
        
        if avg_delta is None:
            avg_delta = frameDelta.copy().astype("float")

        # compute the average delta over the past few frames
        # the alpha value can be modified to configure how sensitive the motion detection is.
        # higher values mean the current frame impacts the delta a lot, and a single raindrop may
        # register as motion, too low and a fast moving person wont be detected as motion
        # this also assumes that a person is in the same location across more than a single frame
        cv2.accumulateWeighted(frameDelta, avg_delta, 0.2)

        # compute the threshold image for the current frame
        current_thresh = cv2.threshold(frameDelta, 25, 255, cv2.THRESH_BINARY)[1]

        # black out everything in the avg_delta where there isnt motion in the current frame
        avg_delta_image = cv2.convertScaleAbs(avg_delta)
        avg_delta_image[np.where(current_thresh==[0])] = [0]

        # then look for deltas above the threshold, but only in areas where there is a delta
        # in the current frame. this prevents deltas from previous frames from being included
        thresh = cv2.threshold(avg_delta_image, 25, 255, cv2.THRESH_BINARY)[1]
 
        # dilate the thresholded image to fill in holes, then find contours
        # on thresholded image
        thresh = cv2.dilate(thresh, None, iterations=2)
        cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)

        # if there are no contours, there is no motion
        if len(cnts) < 1:
            motion_frames = 0
            continue

        motion_found = False

        # loop over the contours
        for c in cnts:
            # if the contour is big enough, count it as motion
            contour_area = cv2.contourArea(c)
            if contour_area > min_motion_area:
                motion_found = True
                if debug:
                    cv2.drawContours(cropped_frame, [c], -1, (0, 255, 0), 2)
                    x, y, w, h = cv2.boundingRect(c)
                    cv2.putText(cropped_frame, str(contour_area), (x, y),
		                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 100, 0), 2)
                else:
                    break
        
        if motion_found:
            motion_frames += 1
            # if there have been enough consecutive motion frames, report motion
            if motion_frames >= 3:
                # only average in the current frame if the difference persists for at least 3 frames
                cv2.accumulateWeighted(gray, avg_frame, 0.01)
                motion_detected.set()
                with motion_changed:
                    motion_changed.notify_all()
        else:
            # when no motion, just keep averaging the frames together
            cv2.accumulateWeighted(gray, avg_frame, 0.01)
            motion_frames = 0
            if motion_detected.is_set():
                motion_detected.clear()
                with motion_changed:
                    motion_changed.notify_all()

        if debug and motion_frames == 3:
            cv2.imwrite("/lab/debug/motion-{}-{}-{}.jpg".format(region_x_offset, region_y_offset, datetime.datetime.now().timestamp()), cropped_frame)
            cv2.imwrite("/lab/debug/avg_delta-{}-{}-{}.jpg".format(region_x_offset, region_y_offset, datetime.datetime.now().timestamp()), avg_delta_image)
