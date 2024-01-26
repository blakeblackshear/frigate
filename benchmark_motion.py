import datetime
import multiprocessing as mp
import os

import cv2
import numpy as np

from frigate.config import MotionConfig
from frigate.motion.improved_motion import ImprovedMotionDetector
from frigate.util import create_mask

# get info on the video
# cap = cv2.VideoCapture("debug/front_cam_2023_05_23_08_41__2023_05_23_08_43.mp4")
# cap = cv2.VideoCapture("debug/motion_test_clips/rain_1.mp4")
cap = cv2.VideoCapture("debug/motion_test_clips/lawn_mower_night_1.mp4")
# cap = cv2.VideoCapture("airport.mp4")
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)
frame_shape = (height, width, 3)
# Nick back:
# "1280,0,1280,316,1170,216,1146,126,1016,127,979,82,839,0",
# "310,350,300,402,224,405,241,354",
# "378,0,375,26,0,23,0,0",
# Front door:
# "1080,0,1080,339,1010,280,1020,169,777,163,452,170,318,299,191,365,186,417,139,470,108,516,40,530,0,514,0,0",
# "336,833,438,1024,346,1093,103,1052,24,814",
# Back
# "1855,0,1851,100,1289,96,1105,161,1045,119,890,121,890,0",
# "505,95,506,138,388,153,384,114",
# "689,72,689,122,549,134,547,89",
# "261,134,264,176,169,195,167,158",
# "145,159,146,202,70,220,65,183",

mask = create_mask(
    (height, width),
    [
        "1080,0,1080,339,1010,280,1020,169,777,163,452,170,318,299,191,365,186,417,139,470,108,516,40,530,0,514,0,0",
        "336,833,438,1024,346,1093,103,1052,24,814",
    ],
)

# create the motion config
motion_config_1 = MotionConfig()
motion_config_1.mask = np.zeros((height, width), np.uint8)
motion_config_1.mask[:] = mask
# motion_config_1.improve_contrast = 1
motion_config_1.frame_height = 150
# motion_config_1.frame_alpha = 0.02
# motion_config_1.threshold = 30
# motion_config_1.contour_area = 10

motion_config_2 = MotionConfig()
motion_config_2.mask = np.zeros((height, width), np.uint8)
motion_config_2.mask[:] = mask
# motion_config_2.improve_contrast = 1
motion_config_2.frame_height = 150
# motion_config_2.frame_alpha = 0.01
motion_config_2.threshold = 20
# motion_config.contour_area = 10

save_images = True

improved_motion_detector_1 = ImprovedMotionDetector(
    frame_shape=frame_shape,
    config=motion_config_1,
    fps=fps,
    improve_contrast=mp.Value("i", motion_config_1.improve_contrast),
    threshold=mp.Value("i", motion_config_1.threshold),
    contour_area=mp.Value("i", motion_config_1.contour_area),
    name="default",
)
improved_motion_detector_1.save_images = save_images

improved_motion_detector_2 = ImprovedMotionDetector(
    frame_shape=frame_shape,
    config=motion_config_2,
    fps=fps,
    improve_contrast=mp.Value("i", motion_config_2.improve_contrast),
    threshold=mp.Value("i", motion_config_2.threshold),
    contour_area=mp.Value("i", motion_config_2.contour_area),
    name="compare",
)
improved_motion_detector_2.save_images = save_images

# read and process frames
ret, frame = cap.read()
frame_counter = 1
while ret:
    yuv_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV_I420)

    start_frame = datetime.datetime.now().timestamp()
    improved_motion_detector_1.detect(yuv_frame)

    start_frame = datetime.datetime.now().timestamp()
    improved_motion_detector_2.detect(yuv_frame)

    default_frame = f"debug/frames/default-{frame_counter}.jpg"
    compare_frame = f"debug/frames/compare-{frame_counter}.jpg"
    if os.path.exists(default_frame) and os.path.exists(compare_frame):
        images = [
            cv2.imread(default_frame),
            cv2.imread(compare_frame),
        ]

        cv2.imwrite(
            f"debug/frames/all-{frame_counter}.jpg",
            cv2.vconcat(images)
            if frame_shape[0] > frame_shape[1]
            else cv2.hconcat(images),
        )
        os.unlink(default_frame)
        os.unlink(compare_frame)
    frame_counter += 1

    ret, frame = cap.read()

cap.release()
