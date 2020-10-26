import os
import time
import datetime
import cv2
import queue
import threading
import ctypes
import multiprocessing as mp
import subprocess as sp
import numpy as np
import copy
import itertools
import json
import base64
from typing import Dict, List
from collections import defaultdict
from frigate.util import draw_box_with_label, yuv_region_2_rgb, area, calculate_region, clipped, intersection_over_union, intersection, EventsPerSecond, listen, FrameManager, SharedMemoryFrameManager
from frigate.objects import ObjectTracker
from frigate.edgetpu import RemoteObjectDetector
from frigate.motion import MotionDetector

def get_frame_shape(source):
    ffprobe_cmd = " ".join([
        'ffprobe',
        '-v',
        'panic',
        '-show_error',
        '-show_streams',
        '-of',
        'json',
        '"'+source+'"'
    ])
    print(ffprobe_cmd)
    p = sp.Popen(ffprobe_cmd, stdout=sp.PIPE, shell=True)
    (output, err) = p.communicate()
    p_status = p.wait()
    info = json.loads(output)
    print(info)

    video_info = [s for s in info['streams'] if s['codec_type'] == 'video'][0]

    if video_info['height'] != 0 and video_info['width'] != 0:
        return (video_info['height'], video_info['width'], 3)
    
    # fallback to using opencv if ffprobe didnt succeed
    video = cv2.VideoCapture(source)
    ret, frame = video.read()
    frame_shape = frame.shape
    video.release()
    return frame_shape

def get_ffmpeg_input(ffmpeg_input):
    frigate_vars = {k: v for k, v in os.environ.items() if k.startswith('FRIGATE_')}
    return ffmpeg_input.format(**frigate_vars)

def filtered(obj, objects_to_track, object_filters, mask=None):
    object_name = obj[0]

    if not object_name in objects_to_track:
        return True
    
    if object_name in object_filters:
        obj_settings = object_filters[object_name]

        # if the min area is larger than the
        # detected object, don't add it to detected objects
        if obj_settings.get('min_area',-1) > obj[3]:
            return True
        
        # if the detected object is larger than the
        # max area, don't add it to detected objects
        if obj_settings.get('max_area', 24000000) < obj[3]:
            return True

        # if the score is lower than the min_score, skip
        if obj_settings.get('min_score', 0) > obj[1]:
            return True
    
        # compute the coordinates of the object and make sure
        # the location isnt outside the bounds of the image (can happen from rounding)
        y_location = min(int(obj[2][3]), len(mask)-1)
        x_location = min(int((obj[2][2]-obj[2][0])/2.0)+obj[2][0], len(mask[0])-1)

        # if the object is in a masked location, don't add it to detected objects
        if (not mask is None) and (mask[y_location][x_location] == 0):
            return True
        
    return False

def create_tensor_input(frame, region):
    cropped_frame = yuv_region_2_rgb(frame, region)

    # Resize to 300x300 if needed
    if cropped_frame.shape != (300, 300, 3):
        cropped_frame = cv2.resize(cropped_frame, dsize=(300, 300), interpolation=cv2.INTER_LINEAR)
    
    # Expand dimensions since the model expects images to have shape: [1, 300, 300, 3]
    return np.expand_dims(cropped_frame, axis=0)

def start_or_restart_ffmpeg(ffmpeg_cmd, frame_size, ffmpeg_process=None):
    if not ffmpeg_process is None:
        print("Terminating the existing ffmpeg process...")
        ffmpeg_process.terminate()
        try:
            print("Waiting for ffmpeg to exit gracefully...")
            ffmpeg_process.communicate(timeout=30)
        except sp.TimeoutExpired:
            print("FFmpeg didnt exit. Force killing...")
            ffmpeg_process.kill()
            ffmpeg_process.communicate()
        ffmpeg_process = None

    print("Creating ffmpeg process...")
    print(" ".join(ffmpeg_cmd))
    process = sp.Popen(ffmpeg_cmd, stdout = sp.PIPE, stdin = sp.DEVNULL, bufsize=frame_size*10, start_new_session=True)
    return process

def capture_frames(ffmpeg_process, camera_name, frame_shape, frame_manager: FrameManager, 
    frame_queue, take_frame: int, fps:mp.Value, skipped_fps: mp.Value, 
    stop_event: mp.Event, current_frame: mp.Value):

    frame_num = 0
    frame_size = frame_shape[0] * frame_shape[1] * 3 // 2
    frame_rate = EventsPerSecond()
    frame_rate.start()
    skipped_eps = EventsPerSecond()
    skipped_eps.start()
    while True:
        fps.value = frame_rate.eps()
        skipped_fps = skipped_eps.eps()
        if stop_event.is_set():
            print(f"{camera_name}: stop event set. exiting capture thread...")
            break

        current_frame.value = datetime.datetime.now().timestamp()
        frame_name = f"{camera_name}{current_frame.value}"
        frame_buffer = frame_manager.create(frame_name, frame_size)
        try:
          frame_buffer[:] = ffmpeg_process.stdout.read(frame_size)
        except:
          print(f"{camera_name}: ffmpeg sent a broken frame. something is wrong.")

          if ffmpeg_process.poll() != None:
              print(f"{camera_name}: ffmpeg process is not running. exiting capture thread...")
              frame_manager.delete(frame_name)
              break
          
          continue

        frame_rate.update()

        frame_num += 1
        if (frame_num % take_frame) != 0:
            skipped_eps.update()
            frame_manager.delete(frame_name)
            continue

        # if the queue is full, skip this frame
        if frame_queue.full():
            skipped_eps.update()
            frame_manager.delete(frame_name)
            continue

        # close the frame
        frame_manager.close(frame_name)

        # add to the queue
        frame_queue.put(current_frame.value)

class CameraWatchdog(threading.Thread):
    def __init__(self, name, config, frame_queue, camera_fps, ffmpeg_pid, stop_event):
        threading.Thread.__init__(self)
        self.name = name
        self.config = config
        self.capture_thread = None
        self.ffmpeg_process = None
        self.stop_event = stop_event
        self.camera_fps = camera_fps
        self.ffmpeg_pid = ffmpeg_pid
        self.frame_queue = frame_queue
        self.frame_shape = self.config['frame_shape']
        self.frame_size = self.frame_shape[0] * self.frame_shape[1] * 3 // 2

    def run(self):
        self.start_ffmpeg()
        time.sleep(10)
        while True:
            if self.stop_event.is_set():
                print(f"Exiting watchdog...")
                break

            now = datetime.datetime.now().timestamp()

            if not self.capture_thread.is_alive():
                self.start_ffmpeg()
            elif now - self.capture_thread.current_frame.value > 5:
                print(f"No frames received from {self.name} in 5 seconds. Exiting ffmpeg...")
                self.ffmpeg_process.terminate()
                try:
                    print("Waiting for ffmpeg to exit gracefully...")
                    self.ffmpeg_process.communicate(timeout=30)
                except sp.TimeoutExpired:
                    print("FFmpeg didnt exit. Force killing...")
                    self.ffmpeg_process.kill()
                    self.ffmpeg_process.communicate()
            
            # wait a bit before checking again
            time.sleep(10)
    
    def start_ffmpeg(self):
      self.ffmpeg_process = start_or_restart_ffmpeg(self.config['ffmpeg_cmd'], self.frame_size)
      self.ffmpeg_pid.value = self.ffmpeg_process.pid
      self.capture_thread = CameraCapture(self.name, self.ffmpeg_process, self.frame_shape, self.frame_queue, 
          self.config['take_frame'], self.camera_fps, self.stop_event)
      self.capture_thread.start()

class CameraCapture(threading.Thread):
    def __init__(self, name, ffmpeg_process, frame_shape, frame_queue, take_frame, fps, stop_event):
        threading.Thread.__init__(self)
        self.name = name
        self.frame_shape = frame_shape
        self.frame_size = frame_shape[0] * frame_shape[1] * frame_shape[2]
        self.frame_queue = frame_queue
        self.take_frame = take_frame
        self.fps = fps
        self.skipped_fps = EventsPerSecond()
        self.frame_manager = SharedMemoryFrameManager()
        self.ffmpeg_process = ffmpeg_process
        self.current_frame = mp.Value('d', 0.0)
        self.last_frame = 0
        self.stop_event = stop_event

    def run(self):
        self.skipped_fps.start()
        capture_frames(self.ffmpeg_process, self.name, self.frame_shape, self.frame_manager, self.frame_queue, self.take_frame,
            self.fps, self.skipped_fps, self.stop_event, self.current_frame)

def capture_camera(name, config, process_info, stop_event):
    frame_queue = process_info['frame_queue']
    camera_watchdog = CameraWatchdog(name, config, frame_queue, process_info['camera_fps'], process_info['ffmpeg_pid'], stop_event)
    camera_watchdog.start()
    camera_watchdog.join()

def track_camera(name, config, detection_queue, result_connection, detected_objects_queue, process_info, stop_event):
    listen()

    frame_queue = process_info['frame_queue']

    frame_shape = config['frame_shape']

    # Merge the tracked object config with the global config
    camera_objects_config = config.get('objects', {})
    objects_to_track = camera_objects_config.get('track', [])
    object_filters = camera_objects_config.get('filters', {})

    # load in the mask for object detection
    if 'mask' in config:
        if config['mask'].startswith('base64,'):
            img = base64.b64decode(config['mask'][7:]) 
            npimg = np.fromstring(img, dtype=np.uint8)
            mask = cv2.imdecode(npimg, cv2.IMREAD_GRAYSCALE)
        elif config['mask'].startswith('poly,'):
            points = config['mask'].split(',')[1:]
            contour =  np.array([[int(points[i]), int(points[i+1])] for i in range(0, len(points), 2)])
            mask = np.zeros((frame_shape[0], frame_shape[1]), np.uint8)
            mask[:] = 255
            cv2.fillPoly(mask, pts=[contour], color=(0))
        else:
            mask = cv2.imread("/config/{}".format(config['mask']), cv2.IMREAD_GRAYSCALE)
    else:
        mask = None

    if mask is None or mask.size == 0:
        mask = np.zeros((frame_shape[0], frame_shape[1]), np.uint8)
        mask[:] = 255

    motion_detector = MotionDetector(frame_shape, mask, resize_factor=6)
    object_detector = RemoteObjectDetector(name, '/labelmap.txt', detection_queue, result_connection)

    object_tracker = ObjectTracker(10)

    frame_manager = SharedMemoryFrameManager()

    process_frames(name, frame_queue, frame_shape, frame_manager, motion_detector, object_detector,
        object_tracker, detected_objects_queue, process_info, objects_to_track, object_filters, mask, stop_event)

    print(f"{name}: exiting subprocess")

def reduce_boxes(boxes):
    if len(boxes) == 0:
        return []
    reduced_boxes = cv2.groupRectangles([list(b) for b in itertools.chain(boxes, boxes)], 1, 0.2)[0]
    return [tuple(b) for b in reduced_boxes]

def detect(object_detector, frame, region, objects_to_track, object_filters, mask):
    tensor_input = create_tensor_input(frame, region)

    detections = []
    region_detections = object_detector.detect(tensor_input)
    for d in region_detections:
        box = d[2]
        size = region[2]-region[0]
        x_min = int((box[1] * size) + region[0])
        y_min = int((box[0] * size) + region[1])
        x_max = int((box[3] * size) + region[0])
        y_max = int((box[2] * size) + region[1])
        det = (d[0],
            d[1],
            (x_min, y_min, x_max, y_max),
            (x_max-x_min)*(y_max-y_min),
            region)
        # apply object filters
        if filtered(det, objects_to_track, object_filters, mask):
            continue
        detections.append(det)
    return detections

def process_frames(camera_name: str, frame_queue: mp.Queue, frame_shape, 
    frame_manager: FrameManager, motion_detector: MotionDetector, 
    object_detector: RemoteObjectDetector, object_tracker: ObjectTracker,
    detected_objects_queue: mp.Queue, process_info: Dict,
    objects_to_track: List[str], object_filters: Dict, mask, stop_event: mp.Event,
    exit_on_empty: bool = False):
    
    fps = process_info['process_fps']
    detection_fps = process_info['detection_fps']
    current_frame_time = process_info['detection_frame']

    fps_tracker = EventsPerSecond()
    fps_tracker.start()

    while True:
        if stop_event.is_set() or (exit_on_empty and frame_queue.empty()):
                print(f"Exiting track_objects...")
                break

        try:
            frame_time = frame_queue.get(True, 10)
        except queue.Empty:
            continue

        current_frame_time.value = frame_time

        frame = frame_manager.get(f"{camera_name}{frame_time}", (frame_shape[0]*3//2, frame_shape[1]))

        if frame is None:
            print(f"{camera_name}: frame {frame_time} is not in memory store.")
            continue

        # look for motion
        motion_boxes = motion_detector.detect(frame)

        tracked_object_boxes = [obj['box'] for obj in object_tracker.tracked_objects.values()]

        # combine motion boxes with known locations of existing objects
        combined_boxes = reduce_boxes(motion_boxes + tracked_object_boxes)

        # compute regions
        regions = [calculate_region(frame_shape, a[0], a[1], a[2], a[3], 1.2)
            for a in combined_boxes]

        # combine overlapping regions
        combined_regions = reduce_boxes(regions)

        # re-compute regions
        regions = [calculate_region(frame_shape, a[0], a[1], a[2], a[3], 1.0)
            for a in combined_regions]

        # resize regions and detect
        detections = []
        for region in regions:
            detections.extend(detect(object_detector, frame, region, objects_to_track, object_filters, mask))
        
        #########
        # merge objects, check for clipped objects and look again up to 4 times
        #########
        refining = True
        refine_count = 0
        while refining and refine_count < 4:
            refining = False

            # group by name
            detected_object_groups = defaultdict(lambda: [])
            for detection in detections:
                detected_object_groups[detection[0]].append(detection)

            selected_objects = []
            for group in detected_object_groups.values():

                # apply non-maxima suppression to suppress weak, overlapping bounding boxes
                boxes = [(o[2][0], o[2][1], o[2][2]-o[2][0], o[2][3]-o[2][1])
                    for o in group]
                confidences = [o[1] for o in group]
                idxs = cv2.dnn.NMSBoxes(boxes, confidences, 0.5, 0.4)

                for index in idxs:
                    obj = group[index[0]]
                    if clipped(obj, frame_shape):
                        box = obj[2]
                        # calculate a new region that will hopefully get the entire object
                        region = calculate_region(frame_shape, 
                            box[0], box[1],
                            box[2], box[3])
                        
                        selected_objects.extend(detect(object_detector, frame, region, objects_to_track, object_filters, mask))

                        refining = True
                    else:
                        selected_objects.append(obj)            
            # set the detections list to only include top, complete objects
            # and new detections
            detections = selected_objects

            if refining:
                refine_count += 1

        # now that we have refined our detections, we need to track objects
        object_tracker.match_and_update(frame_time, detections)

        # add to the queue if not full
        if(detected_objects_queue.full()):
          frame_manager.delete(f"{camera_name}{frame_time}")
          continue
        else:
          fps_tracker.update()
          fps.value = fps_tracker.eps()
          detected_objects_queue.put((camera_name, frame_time, object_tracker.tracked_objects))
          detection_fps.value = object_detector.fps.eps()
          frame_manager.close(f"{camera_name}{frame_time}")
