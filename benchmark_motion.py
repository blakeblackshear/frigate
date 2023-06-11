import datetime
import multiprocessing as mp
import os
from statistics import mean

import cv2
import numpy as np

from frigate.config import MotionConfig
from frigate.motion.frigate_motion import FrigateMotionDetector
from frigate.motion.improved_motion import ImprovedMotionDetector

# get info on the video
# cap = cv2.VideoCapture("debug/front_cam_2023_05_23_08_41__2023_05_23_08_43.mp4")
# cap = cv2.VideoCapture("debug/motion_test_clips/rain_1.mp4")
cap = cv2.VideoCapture("debug/motion_test_clips/ir_off.mp4")
# cap = cv2.VideoCapture("airport.mp4")
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)
frame_shape = (height, width, 3)

# create the motion config
motion_config = MotionConfig()
motion_config.mask = np.zeros((height, width), np.uint8)
motion_config.mask[:] = 255
motion_config.improve_contrast = 1
motion_config.frame_alpha = 0.02
motion_config.threshold = 40
motion_config.contour_area = 15
save_images = True

# create motion detectors
frigate_motion_detector = FrigateMotionDetector(
    frame_shape=frame_shape,
    config=motion_config,
    fps=fps,
    improve_contrast=mp.Value("i", motion_config.improve_contrast),
    threshold=mp.Value("i", motion_config.threshold),
    contour_area=mp.Value("i", motion_config.contour_area),
)
frigate_motion_detector.save_images = save_images

improved_motion_detector = ImprovedMotionDetector(
    frame_shape=frame_shape,
    config=motion_config,
    fps=fps,
    improve_contrast=mp.Value("i", motion_config.improve_contrast),
    threshold=mp.Value("i", motion_config.threshold),
    contour_area=mp.Value("i", motion_config.contour_area),
)
improved_motion_detector.save_images = save_images

# read and process frames
frame_times = {"frigate": [], "improved": []}
ret, frame = cap.read()
frame_counter = 1
while ret:
    yuv_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV_I420)

    start_frame = datetime.datetime.now().timestamp()
    frigate_motion_detector.detect(yuv_frame)
    frame_times["frigate"].append(datetime.datetime.now().timestamp() - start_frame)

    start_frame = datetime.datetime.now().timestamp()
    improved_motion_detector.detect(yuv_frame)
    frame_times["improved"].append(datetime.datetime.now().timestamp() - start_frame)

    frigate_frame = f"debug/frames/frigate-{frame_counter}.jpg"
    improved_frame = f"debug/frames/improved-{frame_counter}.jpg"
    if os.path.exists(frigate_frame) and os.path.exists(improved_frame):
        image_row_1 = cv2.hconcat(
            [
                cv2.imread(frigate_frame),
                cv2.imread(improved_frame),
            ]
        )

        image_row_2 = cv2.resize(
            frame,
            dsize=(
                frigate_motion_detector.motion_frame_size[1] * 2,
                frigate_motion_detector.motion_frame_size[0] * 2,
            ),
            interpolation=cv2.INTER_LINEAR,
        )

        cv2.imwrite(
            f"debug/frames/all-{frame_counter}.jpg",
            cv2.vconcat([image_row_1, image_row_2]),
        )
        os.unlink(frigate_frame)
        os.unlink(improved_frame)
    frame_counter += 1

    ret, frame = cap.read()

cap.release()

print("Frigate Motion Detector")
print(f"Average frame processing time: {mean(frame_times['frigate'])*1000:.2f}ms")
print("Improved Motion Detector")
print(f"Average frame processing time: {mean(frame_times['improved'])*1000:.2f}ms")
