import sys
import click
import os
import datetime
from unittest import TestCase, main
from frigate.video import process_frames, start_or_restart_ffmpeg, capture_frames, get_frame_shape
from frigate.util import DictFrameManager, SharedMemoryFrameManager, EventsPerSecond, draw_box_with_label
from frigate.motion import MotionDetector
from frigate.edgetpu import LocalObjectDetector
from frigate.objects import ObjectTracker
import multiprocessing as mp
import numpy as np
import cv2
from frigate.object_processing import COLOR_MAP, CameraState

class ProcessClip():
    def __init__(self, clip_path, frame_shape, config):
        self.clip_path = clip_path
        self.frame_shape = frame_shape
        self.camera_name = 'camera'
        self.frame_manager = DictFrameManager()
        # self.frame_manager = SharedMemoryFrameManager()
        self.frame_queue = mp.Queue()
        self.detected_objects_queue = mp.Queue()
        self.camera_state = CameraState(self.camera_name, config, self.frame_manager)

    def load_frames(self):
        fps = EventsPerSecond()
        skipped_fps = EventsPerSecond()
        stop_event = mp.Event()
        detection_frame = mp.Value('d', datetime.datetime.now().timestamp()+100000)
        current_frame = mp.Value('d', 0.0)
        ffmpeg_cmd = f"ffmpeg -hide_banner -loglevel panic -i {self.clip_path} -f rawvideo -pix_fmt rgb24 pipe:".split(" ")
        ffmpeg_process = start_or_restart_ffmpeg(ffmpeg_cmd, self.frame_shape[0]*self.frame_shape[1]*self.frame_shape[2])
        capture_frames(ffmpeg_process, self.camera_name, self.frame_shape, self.frame_manager, self.frame_queue, 1, fps, skipped_fps, stop_event, detection_frame, current_frame)
        ffmpeg_process.wait()
        ffmpeg_process.communicate()
    
    def process_frames(self, objects_to_track=['person'], object_filters={}):
        mask = np.zeros((self.frame_shape[0], self.frame_shape[1], 1), np.uint8)
        mask[:] = 255
        motion_detector = MotionDetector(self.frame_shape, mask)

        object_detector = LocalObjectDetector(labels='/labelmap.txt')
        object_tracker = ObjectTracker(10)
        process_fps = mp.Value('d', 0.0)
        detection_fps = mp.Value('d', 0.0)
        current_frame = mp.Value('d', 0.0)
        stop_event = mp.Event()

        process_frames(self.camera_name, self.frame_queue, self.frame_shape, self.frame_manager, motion_detector, object_detector, object_tracker, self.detected_objects_queue, 
            process_fps, detection_fps, current_frame, objects_to_track, object_filters, mask, stop_event, exit_on_empty=True)
    
    def objects_found(self, debug_path=None):
        obj_detected = False
        top_computed_score = 0.0
        def handle_event(name, obj):
            nonlocal obj_detected
            nonlocal top_computed_score
            if obj['computed_score'] > top_computed_score:
                top_computed_score = obj['computed_score']
            if not obj['false_positive']:
                obj_detected = True
        self.camera_state.on('new', handle_event)
        self.camera_state.on('update', handle_event)

        while(not self.detected_objects_queue.empty()):
            camera_name, frame_time, current_tracked_objects = self.detected_objects_queue.get()
            if not debug_path is None:
                self.save_debug_frame(debug_path, frame_time, current_tracked_objects.values())

            self.camera_state.update(frame_time, current_tracked_objects)
            for obj in self.camera_state.tracked_objects.values():
                print(f"{frame_time}: {obj['id']} - {obj['computed_score']} - {obj['score_history']}")
        
        self.frame_manager.delete(self.camera_state.previous_frame_id)
        
        return {
            'object_detected': obj_detected,
            'top_score': top_computed_score
        }
    
    def save_debug_frame(self, debug_path, frame_time, tracked_objects):
        current_frame = self.frame_manager.get(f"{self.camera_name}{frame_time}", self.frame_shape)
        # draw the bounding boxes on the frame
        for obj in tracked_objects:
            thickness = 2
            color = (0,0,175)

            if obj['frame_time'] != frame_time:
                thickness = 1
                color = (255,0,0)
            else:
                color = (255,255,0)

            # draw the bounding boxes on the frame
            box = obj['box']
            draw_box_with_label(current_frame, box[0], box[1], box[2], box[3], obj['label'], f"{int(obj['score']*100)}% {int(obj['area'])}", thickness=thickness, color=color)
            # draw the regions on the frame
            region = obj['region']
            draw_box_with_label(current_frame, region[0], region[1], region[2], region[3], 'region', "", thickness=1, color=(0,255,0))
        
        cv2.imwrite(f"{os.path.join(debug_path, os.path.basename(self.clip_path))}.{int(frame_time*1000000)}.jpg", cv2.cvtColor(current_frame, cv2.COLOR_RGB2BGR))

@click.command()
@click.option("-p", "--path", required=True, help="Path to clip or directory to test.")
@click.option("-l", "--label", default='person', help="Label name to detect.")
@click.option("-t", "--threshold", default=0.85, help="Threshold value for objects.")
@click.option("--debug-path", default=None, help="Path to output frames for debugging.")
def process(path, label, threshold, debug_path):
    clips = []
    if os.path.isdir(path):
        files = os.listdir(path)
        files.sort()
        clips = [os.path.join(path, file) for file in files]
    elif os.path.isfile(path):  
        clips.append(path)

    config = {
        'snapshots': {
            'show_timestamp': False, 
            'draw_zones': False
        },
        'zones': {},
        'objects': {
            'track': [label],
            'filters': {
                'person': {
                    'threshold': threshold
                }
            }
        }
    }

    results = []
    for c in clips:
        frame_shape = get_frame_shape(c)
        config['frame_shape'] = frame_shape
        process_clip = ProcessClip(c, frame_shape, config)
        process_clip.load_frames()
        process_clip.process_frames(objects_to_track=config['objects']['track'])

        results.append((c, process_clip.objects_found(debug_path)))

    for result in results:
        print(f"{result[0]}: {result[1]}")
    
    positive_count = sum(1 for result in results if result[1]['object_detected'])
    print(f"Objects were detected in {positive_count}/{len(results)}({positive_count/len(results)*100:.2f}%) clip(s).")

if __name__ == '__main__':
    process()