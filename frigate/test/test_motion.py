import copy
import cProfile
import io
import logging
import pstats
import sys
import unittest
from pstats import SortKey

import cv2

from frigate.camera import PTZMetrics
from frigate.config.camera.motion import MotionConfig
from frigate.motion.improved_motion import ImprovedMotionDetector
from frigate.util.image import create_mask

logging.basicConfig(level=logging.DEBUG)


class TestMotionVideo:
    def __init__(self, file_name, mask, motion_config, motion_ranges=[]):
        self.file_name = file_name
        self.mask = mask
        self.motion_config = motion_config
        self.motion_ranges = motion_ranges


class TestMotion(unittest.TestCase):
    def setUp(self):
        self.motion_range_threshold = 12  # allow motion to linger for additional frames

        default_mask = [
            "0,0.037,0.253,0.039,0.254,0.113,0,0.113",
            "0.783,0,0.746,0.381,1,0.607,1,0",
        ]
        default_motion_config = MotionConfig()
        default_motion_config.threshold = 120
        default_motion_config.lightning_threshold = 0.3
        default_motion_config.improve_contrast = True
        default_motion_config.contour_area = 100
        default_motion_config.frame_alpha = 0.008

        # Convert test videos with: ffmpeg -i input.mp4 -filter:v scale=-1:100,hue=s=0 output.mp4
        self.test_clips = [
            TestMotionVideo(
                "testdata/test_motion_video-1.mp4", default_mask, default_motion_config
            ),
            TestMotionVideo(
                "testdata/test_motion_video-2.mp4",
                default_mask,
                default_motion_config,
                [[190, 307]],
            ),
            TestMotionVideo(
                "testdata/test_motion_video-3.mp4", default_mask, default_motion_config
            ),
        ]

    def get_motion_detector(self, test_clip):
        cap = cv2.VideoCapture(test_clip.file_name)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.fps = cap.get(cv2.CAP_PROP_FPS)
        frame_shape = (height, width, 3)

        mask = create_mask((height, width), test_clip.mask)
        motion_config = copy.copy(test_clip.motion_config)
        motion_config.mask = mask

        improved_motion_detector = ImprovedMotionDetector(
            frame_shape=frame_shape,
            config=motion_config,
            fps=self.fps,
            ptz_metrics=PTZMetrics(autotracker_enabled=False),
            name="default",
        )
        # Save the frames if running in debug mode.
        improved_motion_detector.save_images = (
            hasattr(sys, "gettrace") and sys.gettrace() is not None
        )

        return cap, improved_motion_detector

    def verify_motion_frames(
        self, test_clip: TestMotionVideo, motion_frames, total_frame_count
    ):
        success = True
        expectedMotionFrameCount = 0
        detectedMotionFrameCount = 0
        for expected_motion_range in test_clip.motion_ranges:
            detectedMotionFrameCount += sum(
                x >= expected_motion_range[0] and x <= expected_motion_range[1]
                for x in motion_frames
            )
            expectedMotionFrameCount += (
                expected_motion_range[1] - expected_motion_range[0]
            )
            if detectedMotionFrameCount == 0:
                success = False
                logging.error(
                    f"{test_clip.file_name} No motion detected in range {expected_motion_range[0]}-{expected_motion_range[1]}"
                )
        logging.debug(
            f"{detectedMotionFrameCount} out of {expectedMotionFrameCount} motion frames detected ({100 if expectedMotionFrameCount == 0 else round(detectedMotionFrameCount / expectedMotionFrameCount * 100, 2)}%)"
        )

        falsePositiveFrameCount = 0
        # For the benefit of readability, a similar calculation is done twice.
        for motion_frame in motion_frames:
            if not any(
                motion_frame >= x[0]
                and (x[1] + self.motion_range_threshold) >= motion_frame
                for x in test_clip.motion_ranges
            ):
                success = False
                logging.error(
                    f"{test_clip.file_name} Invalid motion detected at frame {motion_frame}"
                )
            # When calculating accuracy, we take the exact expected motion ranges. For passing the test, we allow for motion to linger a few frames.
            if not any(
                motion_frame >= x[0] and x[1] >= motion_frame
                for x in test_clip.motion_ranges
            ):
                falsePositiveFrameCount += 1
        logging.debug(
            f"{falsePositiveFrameCount} invalid motion frames detected ({round((total_frame_count - expectedMotionFrameCount - falsePositiveFrameCount) / (total_frame_count - expectedMotionFrameCount) * 100, 2)}%)"
        )

        return success

    def run_test_for_motion_clip(
        self,
        test_clip: TestMotionVideo,
        cap: cv2.VideoCapture,
        motion_detector: ImprovedMotionDetector,
        profile: cProfile.Profile,
    ):
        logging.debug(f"file: {test_clip.file_name}")
        ret, frame = cap.read()
        frame_counter = 1
        motion_frames = []

        while ret:
            yuv_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV_I420)

            profile.enable()
            motion_boxes = motion_detector.detect(yuv_frame)
            profile.disable()
            if len(motion_boxes) > 0 and not motion_detector.is_calibrating():
                motion_frames.append(frame_counter)

            frame_counter += 1
            ret, frame = cap.read()

        cap.release()

        assert self.verify_motion_frames(test_clip, motion_frames, frame_counter)

    def test_motions(self):
        profile = cProfile.Profile()

        for test_clip in self.test_clips:
            cap, motion_detector = self.get_motion_detector(test_clip)
            self.run_test_for_motion_clip(test_clip, cap, motion_detector, profile)

        s = io.StringIO()
        pstats.Stats(profile, stream=s).strip_dirs().sort_stats(
            SortKey.CUMULATIVE
        ).print_stats(r"\((?!\_).*\)$", 10)
        logging.debug(s.getvalue())
