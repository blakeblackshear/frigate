import datetime
from unittest import TestCase, main
from frigate.video import process_frames, start_or_restart_ffmpeg, capture_frames
from frigate.util import DictFrameManager, EventsPerSecond, draw_box_with_label
from frigate.motion import MotionDetector
from frigate.edgetpu import LocalObjectDetector
from frigate.objects import ObjectTracker
import multiprocessing as mp
import numpy as np
import cv2
from frigate.object_processing import COLOR_MAP

class FalsePositiveTests(TestCase):

    def test_back_1594395958_675351_0(self):
        ### load in frames
        frame_shape = (1080,1920,3)
        frame_manager = DictFrameManager()
        frame_queue = mp.Queue()
        fps = EventsPerSecond()
        skipped_fps = EventsPerSecond()
        stop_event = mp.Event()
        detection_frame = mp.Value('d', datetime.datetime.now().timestamp()+100000)
        ffmpeg_cmd = "ffmpeg -hide_banner -loglevel panic -i /debug/false_positives/back-1595647759.228381-0.mp4 -f rawvideo -pix_fmt rgb24 pipe:".split(" ")
        ffmpeg_process = start_or_restart_ffmpeg(ffmpeg_cmd, frame_shape[0]*frame_shape[1]*frame_shape[2])
        capture_frames(ffmpeg_process, "back", frame_shape, frame_manager, frame_queue, 1, fps, skipped_fps, stop_event, detection_frame)
        ffmpeg_process.wait()
        ffmpeg_process.communicate()
        assert(frame_queue.qsize() > 0)
        
        ### process frames
        mask = np.zeros((frame_shape[0], frame_shape[1], 1), np.uint8)
        mask[:] = 255
        motion_detector = MotionDetector(frame_shape, mask)

        object_detector = LocalObjectDetector(labels='/labelmap.txt')
        object_tracker = ObjectTracker(10)
        detected_objects_queue = mp.Queue()
        process_fps = EventsPerSecond()
        current_frame = mp.Value('d', 0.0)

        process_frames("back", frame_queue, frame_shape, frame_manager, motion_detector, object_detector, object_tracker, detected_objects_queue, 
            process_fps, current_frame, ['person'], {}, mask, stop_event, exit_on_empty=True)
        assert(detected_objects_queue.qsize() > 0)

        ### check result
        while(not detected_objects_queue.empty()):
            camera_name, frame_time, current_tracked_objects = detected_objects_queue.get()

            current_frame = frame_manager.get(f"{camera_name}{frame_time}")
            # draw the bounding boxes on the frame
            for obj in current_tracked_objects.values():
                thickness = 2
                color = COLOR_MAP[obj['label']]
                
                if obj['frame_time'] != frame_time:
                    thickness = 1
                    color = (255,0,0)

                # draw the bounding boxes on the frame
                box = obj['box']
                draw_box_with_label(current_frame, box[0], box[1], box[2], box[3], obj['label'], f"{int(obj['score']*100)}% {int(obj['area'])}", thickness=thickness, color=color)
                # draw the regions on the frame
                region = obj['region']
                draw_box_with_label(current_frame, region[0], region[1], region[2], region[3], 'region', f"{region[2]-region[0]}", thickness=1, color=(0,255,0))
            
            cv2.imwrite(f"/debug/frames/{int(frame_time*1000000)}.jpg", cv2.cvtColor(current_frame, cv2.COLOR_RGB2BGR))


if __name__ == '__main__':
    main()