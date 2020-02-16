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
import hashlib
import pyarrow.plasma as plasma
import SharedArray as sa
import copy
import itertools
import json
from collections import defaultdict
from frigate.util import draw_box_with_label, area, calculate_region, clipped, intersection_over_union, intersection, EventsPerSecond
from frigate.objects import ObjectTracker
from frigate.edgetpu import RemoteObjectDetector
from frigate.motion import MotionDetector

# TODO: add back opencv fallback
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

<<<<<<< HEAD
class CameraWatchdog(threading.Thread):
    def __init__(self, camera):
        threading.Thread.__init__(self)
        self.camera = camera

    def run(self):
        prctl.set_name(self.__class__.__name__)
        while True:
            # wait a bit before checking
            time.sleep(10)

            if self.camera.frame_time.value != 0.0 and (datetime.datetime.now().timestamp() - self.camera.frame_time.value) > self.camera.watchdog_timeout:
                print(self.camera.name + ": last frame is more than 5 minutes old, restarting camera capture...")
                self.camera.start_or_restart_capture()
                time.sleep(5)

# Thread to read the stdout of the ffmpeg process and update the current frame
class CameraCapture(threading.Thread):
    def __init__(self, camera):
        threading.Thread.__init__(self)
        self.camera = camera

    def run(self):
        prctl.set_name(self.__class__.__name__)
        frame_num = 0
        while True:
            if self.camera.ffmpeg_process.poll() != None:
                print(self.camera.name + ": ffmpeg process is not running. exiting capture thread...")
                break

            raw_image = self.camera.ffmpeg_process.stdout.read(self.camera.frame_size)

            if len(raw_image) == 0:
                print(self.camera.name + ": ffmpeg didnt return a frame. something is wrong. exiting capture thread...")
                break

            frame_num += 1
            if (frame_num % self.camera.take_frame) != 0:
                continue

            with self.camera.frame_lock:
                # TODO: use frame_queue instead
                self.camera.frame_time.value = datetime.datetime.now().timestamp()
                self.camera.frame_cache[self.camera.frame_time.value] = (
                    np
                    .frombuffer(raw_image, np.uint8)
                    .reshape(self.camera.frame_shape)
                )
                self.camera.frame_queue.put(self.camera.frame_time.value)
            # Notify with the condition that a new frame is ready
            with self.camera.frame_ready:
                self.camera.frame_ready.notify_all()

            self.camera.fps.update()

class VideoWriter(threading.Thread):
    def __init__(self, camera):
        threading.Thread.__init__(self)
        self.camera = camera

    def run(self):
        prctl.set_name(self.__class__.__name__)
        while True:
            (frame_time, tracked_objects) = self.camera.frame_output_queue.get()
            # if len(tracked_objects) == 0:
            #     continue
            # f = open(f"/debug/output/{self.camera.name}-{str(format(frame_time, '.8f'))}.jpg", 'wb')
            # f.write(self.camera.frame_with_objects(frame_time, tracked_objects))
            # f.close()

class Camera:
    def __init__(self, name, ffmpeg_config, global_objects_config, config, prepped_frame_queue, mqtt_client, mqtt_prefix):
        self.name = name
        self.config = config
        self.detected_objects = defaultdict(lambda: [])
        self.frame_cache = {}
        self.last_processed_frame = None
        # queue for re-assembling frames in order
        self.frame_queue = queue.Queue()
        # track how many regions have been requested for a frame so we know when a frame is complete
        self.regions_in_process = {}
        # Lock to control access
        self.regions_in_process_lock = mp.Lock()
        self.finished_frame_queue = queue.Queue()
        self.refined_frame_queue = queue.Queue()
        self.frame_output_queue = queue.Queue()

        self.ffmpeg = config.get('ffmpeg', {})
        self.ffmpeg_input = get_ffmpeg_input(self.ffmpeg['input'])
        self.ffmpeg_global_args = self.ffmpeg.get('global_args', ffmpeg_config['global_args'])
        self.ffmpeg_hwaccel_args = self.ffmpeg.get('hwaccel_args', ffmpeg_config['hwaccel_args'])
        self.ffmpeg_input_args = self.ffmpeg.get('input_args', ffmpeg_config['input_args'])
        self.ffmpeg_output_args = self.ffmpeg.get('output_args', ffmpeg_config['output_args'])

        camera_objects_config = config.get('objects', {})

        self.take_frame = self.config.get('take_frame', 1)
        self.watchdog_timeout = self.config.get('watchdog_timeout', 300)
        self.snapshot_config = {
            'show_timestamp': self.config.get('snapshots', {}).get('show_timestamp', True)
        }
        self.regions = self.config['regions']
        if 'width' in self.config and 'height' in self.config:
            self.frame_shape = (self.config['height'], self.config['width'], 3)
        else:
            self.frame_shape = get_frame_shape(self.ffmpeg_input)
        self.frame_size = self.frame_shape[0] * self.frame_shape[1] * self.frame_shape[2]
        self.mqtt_client = mqtt_client
        self.mqtt_topic_prefix = '{}/{}'.format(mqtt_prefix, self.name)

        # create shared value for storing the frame_time
        self.frame_time = mp.Value('d', 0.0)
        # Lock to control access to the frame
        self.frame_lock = mp.Lock()
        # Condition for notifying that a new frame is ready
        self.frame_ready = mp.Condition()
        # Condition for notifying that objects were tracked
        self.objects_tracked = mp.Condition()

        # Queue for prepped frames, max size set to (number of regions * 5)
        self.resize_queue = queue.Queue()

        # Queue for raw detected objects
        self.detected_objects_queue = queue.Queue()
        self.detected_objects_processor = DetectedObjectsProcessor(self)
        self.detected_objects_processor.start()

        # initialize the frame cache
        self.cached_frame_with_objects = {
            'frame_bytes': [],
            'frame_time': 0
        }

        self.ffmpeg_process = None
        self.capture_thread = None
        self.fps = EventsPerSecond()
        self.skipped_region_tracker = EventsPerSecond()

        # combine tracked objects lists
        self.objects_to_track = set().union(global_objects_config.get('track', ['person', 'car', 'truck']), camera_objects_config.get('track', []))

        # merge object filters
        global_object_filters = global_objects_config.get('filters', {})
        camera_object_filters = camera_objects_config.get('filters', {})
        objects_with_config = set().union(global_object_filters.keys(), camera_object_filters.keys())
        self.object_filters = {}
        for obj in objects_with_config:
            self.object_filters[obj] = {**global_object_filters.get(obj, {}), **camera_object_filters.get(obj, {})}

        # start a thread to track objects
        self.object_tracker = ObjectTracker(self, 10)
        self.object_tracker.start()

        # start a thread to write tracked frames to disk
        self.video_writer = VideoWriter(self)
        self.video_writer.start()

        # start a thread to queue resize requests for regions
        self.region_requester = RegionRequester(self)
        self.region_requester.start()

        # start a thread to cache recent frames for processing
        self.frame_tracker = FrameTracker(self.frame_time, 
            self.frame_ready, self.frame_lock, self.frame_cache)
        self.frame_tracker.start()

        # start a thread to resize regions
        self.region_prepper = RegionPrepper(self, self.frame_cache, self.resize_queue, prepped_frame_queue)
        self.region_prepper.start()

        # start a thread to store the highest scoring recent frames for monitored object types
        self.best_frames = BestFrames(self)
        self.best_frames.start()

        # start a thread to expire objects from the detected objects list
        self.object_cleaner = ObjectCleaner(self)
        self.object_cleaner.start()

        # start a thread to refine regions when objects are clipped
        self.dynamic_region_fps = EventsPerSecond()
        self.region_refiner = RegionRefiner(self)
        self.region_refiner.start()
        self.dynamic_region_fps.start()

        # start a thread to publish object scores
        mqtt_publisher = MqttObjectPublisher(self.mqtt_client, self.mqtt_topic_prefix, self)
        mqtt_publisher.start()

        # create a watchdog thread for capture process
        self.watchdog = CameraWatchdog(self)

        # load in the mask for object detection
        if 'mask' in self.config:
            self.mask = cv2.imread("/config/{}".format(self.config['mask']), cv2.IMREAD_GRAYSCALE)
        else:
            self.mask = None

        if self.mask is None:
            self.mask = np.zeros((self.frame_shape[0], self.frame_shape[1], 1), np.uint8)
            self.mask[:] = 255


    def start_or_restart_capture(self):
        if not self.ffmpeg_process is None:
            print("Terminating the existing ffmpeg process...")
            self.ffmpeg_process.terminate()
            try:
                print("Waiting for ffmpeg to exit gracefully...")
                self.ffmpeg_process.wait(timeout=30)
            except sp.TimeoutExpired:
                print("FFmpeg didnt exit. Force killing...")
                self.ffmpeg_process.kill()
                self.ffmpeg_process.wait()

            print("Waiting for the capture thread to exit...")
            self.capture_thread.join()
            self.ffmpeg_process = None
            self.capture_thread = None
        
# # Thread to read the stdout of the ffmpeg process and update the current frame
# class CameraCapture(threading.Thread):
#     def __init__(self, camera):
#         threading.Thread.__init__(self)
#         self.camera = camera

#     def run(self):
#         prctl.set_name(self.__class__.__name__)
#         frame_num = 0
#         while True:
#             if self.camera.ffmpeg_process.poll() != None:
#                 print(self.camera.name + ": ffmpeg process is not running. exiting capture thread...")
#                 break

#             raw_image = self.camera.ffmpeg_process.stdout.read(self.camera.frame_size)

#             if len(raw_image) == 0:
#                 print(self.camera.name + ": ffmpeg didnt return a frame. something is wrong. exiting capture thread...")
#                 break

#             frame_num += 1
#             if (frame_num % self.camera.take_frame) != 0:
#                 continue

#             with self.camera.frame_lock:
#                 # TODO: use frame_queue instead
#                 self.camera.frame_time.value = datetime.datetime.now().timestamp()
#                 self.camera.frame_cache[self.camera.frame_time.value] = (
#                     np
#                     .frombuffer(raw_image, np.uint8)
#                     .reshape(self.camera.frame_shape)
#                 )
#                 self.camera.frame_queue.put(self.camera.frame_time.value)
#             # Notify with the condition that a new frame is ready
#             with self.camera.frame_ready:
#                 self.camera.frame_ready.notify_all()

#             self.camera.fps.update()

# class VideoWriter(threading.Thread):
#     def __init__(self, camera):
#         threading.Thread.__init__(self)
#         self.camera = camera

#     def run(self):
#         prctl.set_name(self.__class__.__name__)
#         while True:
#             (frame_time, tracked_objects) = self.camera.frame_output_queue.get()
#             # if len(tracked_objects) == 0:
#             #     continue
#             # f = open(f"/debug/output/{self.camera.name}-{str(format(frame_time, '.8f'))}.jpg", 'wb')
#             # f.write(self.camera.frame_with_objects(frame_time, tracked_objects))
#             # f.close()

# class Camera:
#     def __init__(self, name, ffmpeg_config, global_objects_config, config, tflite_process, mqtt_client, mqtt_prefix):
#         self.name = name
#         self.config = config
#         self.detected_objects = defaultdict(lambda: [])
#         self.frame_cache = {}
#         self.last_processed_frame = None
#         # queue for re-assembling frames in order
#         self.frame_queue = queue.Queue()
#         # track how many regions have been requested for a frame so we know when a frame is complete
#         self.regions_in_process = {}
#         # Lock to control access
#         self.regions_in_process_lock = mp.Lock()
#         self.finished_frame_queue = queue.Queue()
#         self.refined_frame_queue = queue.Queue()
#         self.frame_output_queue = queue.Queue()

#         self.ffmpeg = config.get('ffmpeg', {})
#         self.ffmpeg_input = get_ffmpeg_input(self.ffmpeg['input'])
#         self.ffmpeg_global_args = self.ffmpeg.get('global_args', ffmpeg_config['global_args'])
#         self.ffmpeg_hwaccel_args = self.ffmpeg.get('hwaccel_args', ffmpeg_config['hwaccel_args'])
#         self.ffmpeg_input_args = self.ffmpeg.get('input_args', ffmpeg_config['input_args'])
#         self.ffmpeg_output_args = self.ffmpeg.get('output_args', ffmpeg_config['output_args'])

#         camera_objects_config = config.get('objects', {})

#         self.take_frame = self.config.get('take_frame', 1)
#         self.watchdog_timeout = self.config.get('watchdog_timeout', 300)
#         self.snapshot_config = {
#             'show_timestamp': self.config.get('snapshots', {}).get('show_timestamp', True)
#         }
#         self.regions = self.config['regions']
#         self.frame_shape = get_frame_shape(self.ffmpeg_input)
#         self.frame_size = self.frame_shape[0] * self.frame_shape[1] * self.frame_shape[2]
#         self.mqtt_client = mqtt_client
#         self.mqtt_topic_prefix = '{}/{}'.format(mqtt_prefix, self.name)

#         # create shared value for storing the frame_time
#         self.frame_time = mp.Value('d', 0.0)
#         # Lock to control access to the frame
#         self.frame_lock = mp.Lock()
#         # Condition for notifying that a new frame is ready
#         self.frame_ready = mp.Condition()
#         # Condition for notifying that objects were tracked
#         self.objects_tracked = mp.Condition()

#         # Queue for prepped frames, max size set to (number of regions * 5)
#         self.resize_queue = queue.Queue()

#         # Queue for raw detected objects
#         self.detected_objects_queue = queue.Queue()
#         self.detected_objects_processor = DetectedObjectsProcessor(self)
#         self.detected_objects_processor.start()

#         # initialize the frame cache
#         self.cached_frame_with_objects = {
#             'frame_bytes': [],
#             'frame_time': 0
#         }

#         self.ffmpeg_process = None
#         self.capture_thread = None
#         self.fps = EventsPerSecond()
#         self.skipped_region_tracker = EventsPerSecond()

#         # combine tracked objects lists
#         self.objects_to_track = set().union(global_objects_config.get('track', ['person', 'car', 'truck']), camera_objects_config.get('track', []))

#         # merge object filters
#         global_object_filters = global_objects_config.get('filters', {})
#         camera_object_filters = camera_objects_config.get('filters', {})
#         objects_with_config = set().union(global_object_filters.keys(), camera_object_filters.keys())
#         self.object_filters = {}
#         for obj in objects_with_config:
#             self.object_filters[obj] = {**global_object_filters.get(obj, {}), **camera_object_filters.get(obj, {})}

#         # start a thread to track objects
#         self.object_tracker = ObjectTracker(self, 10)
#         self.object_tracker.start()

#         # start a thread to write tracked frames to disk
#         self.video_writer = VideoWriter(self)
#         self.video_writer.start()

#         # start a thread to queue resize requests for regions
#         self.region_requester = RegionRequester(self)
#         self.region_requester.start()

#         # start a thread to cache recent frames for processing
#         self.frame_tracker = FrameTracker(self.frame_time, 
#             self.frame_ready, self.frame_lock, self.frame_cache)
#         self.frame_tracker.start()

#         # start a thread to resize regions
#         self.region_prepper = RegionPrepper(self, self.frame_cache, self.resize_queue, prepped_frame_queue)
#         self.region_prepper.start()

#         # start a thread to store the highest scoring recent frames for monitored object types
#         self.best_frames = BestFrames(self)
#         self.best_frames.start()

#         # start a thread to expire objects from the detected objects list
#         self.object_cleaner = ObjectCleaner(self)
#         self.object_cleaner.start()

#         # start a thread to refine regions when objects are clipped
#         self.dynamic_region_fps = EventsPerSecond()
#         self.region_refiner = RegionRefiner(self)
#         self.region_refiner.start()
#         self.dynamic_region_fps.start()

#         # start a thread to publish object scores
#         mqtt_publisher = MqttObjectPublisher(self.mqtt_client, self.mqtt_topic_prefix, self)
#         mqtt_publisher.start()

#         # create a watchdog thread for capture process
#         self.watchdog = CameraWatchdog(self)

#         # load in the mask for object detection
#         if 'mask' in self.config:
#             self.mask = cv2.imread("/config/{}".format(self.config['mask']), cv2.IMREAD_GRAYSCALE)
#         else:
#             self.mask = None

#         if self.mask is None:
#             self.mask = np.zeros((self.frame_shape[0], self.frame_shape[1], 1), np.uint8)
#             self.mask[:] = 255


#     def start_or_restart_capture(self):
#         if not self.ffmpeg_process is None:
#             print("Terminating the existing ffmpeg process...")
#             self.ffmpeg_process.terminate()
#             try:
#                 print("Waiting for ffmpeg to exit gracefully...")
#                 self.ffmpeg_process.wait(timeout=30)
#             except sp.TimeoutExpired:
#                 print("FFmpeg didnt exit. Force killing...")
#                 self.ffmpeg_process.kill()
#                 self.ffmpeg_process.wait()

#             print("Waiting for the capture thread to exit...")
#             self.capture_thread.join()
#             self.ffmpeg_process = None
#             self.capture_thread = None
            
#         # create the process to capture frames from the input stream and store in a shared array
#         print("Creating a new ffmpeg process...")
#         self.start_ffmpeg()
        
#         print("Creating a new capture thread...")
#         self.capture_thread = CameraCapture(self)
#         print("Starting a new capture thread...")
#         self.capture_thread.start()
#         self.fps.start()
#         self.skipped_region_tracker.start()
    
#     def start_ffmpeg(self):
#         ffmpeg_cmd = (['ffmpeg'] +
#             self.ffmpeg_global_args +
#             self.ffmpeg_hwaccel_args +
#             self.ffmpeg_input_args +
#             ['-i', self.ffmpeg_input] +
#             self.ffmpeg_output_args +
#             ['pipe:'])

#         print(" ".join(ffmpeg_cmd))
        
#         self.ffmpeg_process = sp.Popen(ffmpeg_cmd, stdout = sp.PIPE, bufsize=self.frame_size)
    
#     def start(self):
#         self.start_or_restart_capture()
#         self.watchdog.start()
    
#     def join(self):
#         self.capture_thread.join()
    
#     def get_capture_pid(self):
#         return self.ffmpeg_process.pid
    
#     def get_best(self, label):
#         return self.best_frames.best_frames.get(label)

#     def stats(self):
#         # TODO: anything else?
#         return {
#             'camera_fps': self.fps.eps(60),
#             'resize_queue': self.resize_queue.qsize(),
#             'frame_queue': self.frame_queue.qsize(),
#             'finished_frame_queue': self.finished_frame_queue.qsize(),
#             'refined_frame_queue': self.refined_frame_queue.qsize(),
#             'regions_in_process': self.regions_in_process,
#             'dynamic_regions_per_sec': self.dynamic_region_fps.eps(),
#             'skipped_regions_per_sec': self.skipped_region_tracker.eps(60)
#         }
    
#     def frame_with_objects(self, frame_time, tracked_objects=None):
#         if not frame_time in self.frame_cache:
#             frame = np.zeros(self.frame_shape, np.uint8)
#         else:
#             frame = self.frame_cache[frame_time].copy()
            
#         detected_objects = self.detected_objects[frame_time].copy()

#         for region in self.regions:
#             color = (255,255,255)
#             cv2.rectangle(frame, (region['x_offset'], region['y_offset']), 
#                 (region['x_offset']+region['size'], region['y_offset']+region['size']), 
#                 color, 2)

#         # draw the bounding boxes on the screen

#         if tracked_objects is None:
#             with self.object_tracker.tracked_objects_lock:
#                 tracked_objects = copy.deepcopy(self.object_tracker.tracked_objects)

#         for obj in detected_objects:
#             draw_box_with_label(frame, obj['box']['xmin'], obj['box']['ymin'], obj['box']['xmax'], obj['box']['ymax'], obj['name'], "{}% {}".format(int(obj['score']*100), obj['area']), thickness=3)
        
#         for id, obj in tracked_objects.items():
#             color = (0, 255,0) if obj['frame_time'] == frame_time else (255, 0, 0)
#             draw_box_with_label(frame, obj['box']['xmin'], obj['box']['ymin'], obj['box']['xmax'], obj['box']['ymax'], obj['name'], id, color=color, thickness=1, position='bl')

#         # print a timestamp
#         time_to_show = datetime.datetime.fromtimestamp(frame_time).strftime("%m/%d/%Y %H:%M:%S")
#         cv2.putText(frame, time_to_show, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)
        
#         # print fps
#         cv2.putText(frame, str(self.fps.eps())+'FPS', (10, 60), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)

#         # convert to BGR
#         frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

#         # encode the image into a jpg
#         ret, jpg = cv2.imencode('.jpg', frame)

#         return jpg.tobytes()

#     def get_current_frame_with_objects(self):
#         frame_time = self.last_processed_frame
#         if frame_time == self.cached_frame_with_objects['frame_time']:
#             return self.cached_frame_with_objects['frame_bytes']

#         frame_bytes = self.frame_with_objects(frame_time)

#         self.cached_frame_with_objects = {
#             'frame_bytes': frame_bytes,
#             'frame_time': frame_time
#         }

#         return frame_bytes

=======
>>>>>>> 2a2fbe7... cleanup old code
def filtered(obj, objects_to_track, object_filters, mask):
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

        # if the score is lower than the threshold, skip
        if obj_settings.get('threshold', 0) > obj[1]:
            return True
    
        # compute the coordinates of the object and make sure
        # the location isnt outside the bounds of the image (can happen from rounding)
        y_location = min(int(obj[2][3]), len(mask)-1)
        x_location = min(int((obj[2][2]-obj[2][0])/2.0)+obj[2][0], len(mask[0])-1)

        # if the object is in a masked location, don't add it to detected objects
        if mask[y_location][x_location] == [0]:
            return True
        
        return False

def create_tensor_input(frame, region):
    cropped_frame = frame[region[1]:region[3], region[0]:region[2]]

    # Resize to 300x300 if needed
    if cropped_frame.shape != (300, 300, 3):
        cropped_frame = cv2.resize(cropped_frame, dsize=(300, 300), interpolation=cv2.INTER_LINEAR)
    
    # Expand dimensions since the model expects images to have shape: [1, 300, 300, 3]
    return np.expand_dims(cropped_frame, axis=0)

def track_camera(name, config, ffmpeg_global_config, global_objects_config, detect_lock, detect_ready, frame_ready, detected_objects_queue, fps, skipped_fps):
    print(f"Starting process for {name}: {os.getpid()}")

    # Merge the ffmpeg config with the global config
    ffmpeg = config.get('ffmpeg', {})
    ffmpeg_input = get_ffmpeg_input(ffmpeg['input'])
    ffmpeg_global_args = ffmpeg.get('global_args', ffmpeg_global_config['global_args'])
    ffmpeg_hwaccel_args = ffmpeg.get('hwaccel_args', ffmpeg_global_config['hwaccel_args'])
    ffmpeg_input_args = ffmpeg.get('input_args', ffmpeg_global_config['input_args'])
    ffmpeg_output_args = ffmpeg.get('output_args', ffmpeg_global_config['output_args'])

    # Merge the tracked object config with the global config
    camera_objects_config = config.get('objects', {})    
    # combine tracked objects lists
    objects_to_track = set().union(global_objects_config.get('track', ['person', 'car', 'truck']), camera_objects_config.get('track', []))
    # merge object filters
    global_object_filters = global_objects_config.get('filters', {})
    camera_object_filters = camera_objects_config.get('filters', {})
    objects_with_config = set().union(global_object_filters.keys(), camera_object_filters.keys())
    object_filters = {}
    for obj in objects_with_config:
        object_filters[obj] = {**global_object_filters.get(obj, {}), **camera_object_filters.get(obj, {})}

    min_fps = config.get('min_fps', 0)
    take_frame = config.get('take_frame', 1)

    # TODO: some kind of watchdog replacement...
    # watchdog_timeout = config.get('watchdog_timeout', 300)

    frame_shape = get_frame_shape(ffmpeg_input)
    frame_size = frame_shape[0] * frame_shape[1] * frame_shape[2]

    try:
        sa.delete(name)
    except:
        pass

    frame = sa.create(name, shape=frame_shape, dtype=np.uint8)

    # load in the mask for object detection
    if 'mask' in config:
        mask = cv2.imread("/config/{}".format(config['mask']), cv2.IMREAD_GRAYSCALE)
    else:
        mask = None

    if mask is None:
        mask = np.zeros((frame_shape[0], frame_shape[1], 1), np.uint8)
        mask[:] = 255

    motion_detector = MotionDetector(frame_shape, mask, resize_factor=6)
    object_detector = RemoteObjectDetector('/lab/labelmap.txt', detect_lock, detect_ready, frame_ready)

    object_tracker = ObjectTracker(10)

    ffmpeg_cmd = (['ffmpeg'] +
            ffmpeg_global_args +
            ffmpeg_hwaccel_args +
            ffmpeg_input_args +
            ['-i', ffmpeg_input] +
            ffmpeg_output_args +
            ['pipe:'])

    print(" ".join(ffmpeg_cmd))
    
    ffmpeg_process = sp.Popen(ffmpeg_cmd, stdout = sp.PIPE, bufsize=frame_size)
    
    plasma_client = plasma.connect("/tmp/plasma")
    frame_num = 0
    fps_tracker = EventsPerSecond()
    skipped_fps_tracker = EventsPerSecond()
    fps_tracker.start()
    skipped_fps_tracker.start()
    while True:
        frame_bytes = ffmpeg_process.stdout.read(frame_size)

        if not frame_bytes:
            # TODO: restart the ffmpeg process and track number of restarts
            break

        # limit frame rate
        frame_num += 1
        if (frame_num % take_frame) != 0:
            continue

        fps_tracker.update()
        fps.value = fps_tracker.eps()

        frame_time = datetime.datetime.now().timestamp()
        
        # Store frame in numpy array
        frame[:] = (np
                    .frombuffer(frame_bytes, np.uint8)
                    .reshape(frame_shape))
        
        # look for motion
        motion_boxes = motion_detector.detect(frame)

        # skip object detection if we are below the min_fps
        if frame_num > 50 and fps.value < min_fps:
            skipped_fps_tracker.update()
            skipped_fps.value = skipped_fps_tracker.eps()
            continue
        
        skipped_fps.value = skipped_fps_tracker.eps()

        tracked_objects = object_tracker.tracked_objects.values()

        # merge areas of motion that intersect with a known tracked object into a single area to look at
        areas_of_interest = []
        used_motion_boxes = []
        for obj in tracked_objects:
            x_min, y_min, x_max, y_max = obj['box']
            for m_index, motion_box in enumerate(motion_boxes):
                if area(intersection(obj['box'], motion_box))/area(motion_box) > .5:
                    used_motion_boxes.append(m_index)
                    x_min = min(obj['box'][0], motion_box[0])
                    y_min = min(obj['box'][1], motion_box[1])
                    x_max = max(obj['box'][2], motion_box[2])
                    y_max = max(obj['box'][3], motion_box[3])
            areas_of_interest.append((x_min, y_min, x_max, y_max))
        unused_motion_boxes = set(range(0, len(motion_boxes))).difference(used_motion_boxes)
        
        # compute motion regions
        motion_regions = [calculate_region(frame_shape, motion_boxes[i][0], motion_boxes[i][1], motion_boxes[i][2], motion_boxes[i][3], 1.2)
            for i in unused_motion_boxes]
        
        # compute tracked object regions
        object_regions = [calculate_region(frame_shape, a[0], a[1], a[2], a[3], 1.2)
            for a in areas_of_interest]
        
        # merge regions with high IOU
        merged_regions = motion_regions+object_regions
        while True:
            max_iou = 0.0
            max_indices = None
            region_indices = range(len(merged_regions))
            for a, b in itertools.combinations(region_indices, 2):
                iou = intersection_over_union(merged_regions[a], merged_regions[b])
                if iou > max_iou:
                    max_iou = iou
                    max_indices = (a, b)
            if max_iou > 0.1:
                a = merged_regions[max_indices[0]]
                b = merged_regions[max_indices[1]]
                merged_regions.append(calculate_region(frame_shape,
                    min(a[0], b[0]),
                    min(a[1], b[1]),
                    max(a[2], b[2]),
                    max(a[3], b[3]),
                    1
                ))
                del merged_regions[max(max_indices[0], max_indices[1])]
                del merged_regions[min(max_indices[0], max_indices[1])]
            else:
                break

        # resize regions and detect
        detections = []
        for region in merged_regions:

            tensor_input = create_tensor_input(frame, region)

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
                if filtered(det, objects_to_track, object_filters, mask):
                    continue
                detections.append(det)

        #########
        # merge objects, check for clipped objects and look again up to N times
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
                    if clipped(obj, frame_shape): #obj['clipped']:
                        box = obj[2]
                        # calculate a new region that will hopefully get the entire object
                        region = calculate_region(frame_shape, 
                            box[0], box[1],
                            box[2], box[3])
                        
                        tensor_input = create_tensor_input(frame, region)
                        # run detection on new region
                        refined_detections = object_detector.detect(tensor_input)
                        for d in refined_detections:
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
                            if filtered(det, objects_to_track, object_filters, mask):
                                continue
                            selected_objects.append(det)

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

        # put the frame in the plasma store
        object_id = hashlib.sha1(str.encode(f"{name}{frame_time}")).digest()
        plasma_client.put(frame, plasma.ObjectID(object_id))
        # add to the queue
        detected_objects_queue.put((name, frame_time, object_tracker.tracked_objects))

        # if (frames >= 700 and frames <= 1635) or (frames >= 2500):
        # if (frames >= 300 and frames <= 600):
        # if (frames >= 0):
            # row1 = cv2.hconcat([gray, cv2.convertScaleAbs(avg_frame)])
            # row2 = cv2.hconcat([frameDelta, thresh])
            # cv2.imwrite(f"/lab/debug/output/{frames}.jpg", cv2.vconcat([row1, row2]))
            # # cv2.imwrite(f"/lab/debug/output/resized-frame-{frames}.jpg", resized_frame)
            # for region in motion_regions:
            #     cv2.rectangle(frame, (region[0], region[1]), (region[2], region[3]), (255,128,0), 2)
            # for region in object_regions:
            #     cv2.rectangle(frame, (region[0], region[1]), (region[2], region[3]), (0,128,255), 2)
            # for region in merged_regions:
            #     cv2.rectangle(frame, (region[0], region[1]), (region[2], region[3]), (0,255,0), 2)
            # for box in motion_boxes:
            #     cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (255,0,0), 2)
            # for detection in detections:
            #     box = detection[2]
            #     draw_box_with_label(frame, box[0], box[1], box[2], box[3], detection[0], f"{detection[1]*100}%")
            # for obj in object_tracker.tracked_objects.values():
            #     box = obj['box']
            #     draw_box_with_label(frame, box[0], box[1], box[2], box[3], obj['label'], obj['id'], thickness=1, color=(0,0,255), position='bl')
            # cv2.putText(frame, str(total_detections), (10, 10), cv2.FONT_HERSHEY_SIMPLEX, fontScale=0.5, color=(0, 0, 0), thickness=2)
            # cv2.putText(frame, str(frame_detections), (10, 30), cv2.FONT_HERSHEY_SIMPLEX, fontScale=0.5, color=(0, 0, 0), thickness=2)
            # cv2.imwrite(f"/lab/debug/output/frame-{frames}.jpg", frame)
            # break

    # start a thread to publish object scores
    # mqtt_publisher = MqttObjectPublisher(self.mqtt_client, self.mqtt_topic_prefix, self)
    # mqtt_publisher.start()

    # create a watchdog thread for capture process
    # self.watchdog = CameraWatchdog(self)


