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
import prctl
import itertools
from collections import defaultdict
from frigate.util import tonumpyarray, LABELS, draw_box_with_label, calculate_region, EventsPerSecond
from frigate.object_detection import RegionPrepper, RegionRequester
from frigate.objects import ObjectCleaner, BestFrames, DetectedObjectsProcessor, RegionRefiner, ObjectTracker
from frigate.mqtt import MqttObjectPublisher

# Stores 2 seconds worth of frames so they can be used for other threads
class FrameTracker(threading.Thread):
    def __init__(self, frame_time, frame_ready, frame_lock, recent_frames):
        threading.Thread.__init__(self)
        self.frame_time = frame_time
        self.frame_ready = frame_ready
        self.frame_lock = frame_lock
        self.recent_frames = recent_frames
    
    def run(self):
        prctl.set_name("FrameTracker")
        while True:
            # wait for a frame
            with self.frame_ready:
                self.frame_ready.wait()

            now = datetime.datetime.now().timestamp()
            # delete any old frames
            stored_frame_times = list(self.recent_frames.keys())
            for k in stored_frame_times:
                if (now - k) > 10:
                    del self.recent_frames[k]

def get_frame_shape(source):
    # capture a single frame and check the frame shape so the correct array
    # size can be allocated in memory
    video = cv2.VideoCapture(source)
    ret, frame = video.read()
    frame_shape = frame.shape
    video.release()
    return frame_shape

def get_ffmpeg_input(ffmpeg_input):
    frigate_vars = {k: v for k, v in os.environ.items() if k.startswith('FRIGATE_')}
    return ffmpeg_input.format(**frigate_vars)

class CameraWatchdog(threading.Thread):
    def __init__(self, camera):
        threading.Thread.__init__(self)
        self.camera = camera

    def run(self):
        prctl.set_name("CameraWatchdog")
        while True:
            # wait a bit before checking
            time.sleep(10)

            if (datetime.datetime.now().timestamp() - self.camera.frame_time.value) > 300:
                print("last frame is more than 5 minutes old, restarting camera capture...")
                self.camera.start_or_restart_capture()
                time.sleep(5)

# Thread to read the stdout of the ffmpeg process and update the current frame
class CameraCapture(threading.Thread):
    def __init__(self, camera):
        threading.Thread.__init__(self)
        self.camera = camera

    def run(self):
        prctl.set_name("CameraCapture")
        frame_num = 0
        while True:
            if self.camera.ffmpeg_process.poll() != None:
                print("ffmpeg process is not running. exiting capture thread...")
                break

            raw_image = self.camera.ffmpeg_process.stdout.read(self.camera.frame_size)

            if len(raw_image) == 0:
                print("ffmpeg didnt return a frame. something is wrong. exiting capture thread...")
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
        prctl.set_name("VideoWriter")
        while True:
            frame_time = self.camera.frame_tracked_queue.get()
            if len(self.camera.detected_objects[frame_time]) == 0:
                continue
            f = open(f"/debug/{self.camera.name}-{str(frame_time)}.jpg", 'wb')
            f.write(self.camera.frame_with_objects(frame_time))
            f.close()

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
        self.frame_tracked_queue = queue.Queue()

        self.ffmpeg = config.get('ffmpeg', {})
        self.ffmpeg_input = get_ffmpeg_input(self.ffmpeg['input'])
        self.ffmpeg_global_args = self.ffmpeg.get('global_args', ffmpeg_config['global_args'])
        self.ffmpeg_hwaccel_args = self.ffmpeg.get('hwaccel_args', ffmpeg_config['hwaccel_args'])
        self.ffmpeg_input_args = self.ffmpeg.get('input_args', ffmpeg_config['input_args'])
        self.ffmpeg_output_args = self.ffmpeg.get('output_args', ffmpeg_config['output_args'])

        camera_objects_config = config.get('objects', {})

        self.take_frame = self.config.get('take_frame', 1)
        self.regions = self.config['regions']
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
        # Condition for notifying that objects were parsed
        self.objects_parsed = mp.Condition()

        # Queue for prepped frames, max size set to (number of regions * 5)
        max_queue_size = len(self.config['regions'])*5
        self.resize_queue = queue.Queue(max_queue_size)

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

        # combine tracked objects lists
        self.objects_to_track = set().union(global_objects_config.get('track', ['person', 'car', 'truck']), camera_objects_config.get('track', []))

        # merge object filters
        objects_with_config = set().union(global_objects_config.get('filters', {}).keys(), camera_objects_config.get('filters', {}).keys())
        for obj in objects_with_config:
            self.object_filters = {**global_objects_config.get(obj, {}), **camera_objects_config.get(obj, {})}

        # start a thread to queue resize requests for regions
        self.region_requester = RegionRequester(self)
        self.region_requester.start()

        # start a thread to cache recent frames for processing
        self.frame_tracker = FrameTracker(self.frame_time, 
            self.frame_ready, self.frame_lock, self.frame_cache)
        self.frame_tracker.start()

        # start a thread to resize regions
        self.region_prepper = RegionPrepper(self.frame_cache, self.resize_queue, prepped_frame_queue)
        self.region_prepper.start()

        # start a thread to store the highest scoring recent frames for monitored object types
        self.best_frames = BestFrames(self.objects_parsed, self.frame_cache, self.detected_objects)
        self.best_frames.start()

        # start a thread to expire objects from the detected objects list
        self.object_cleaner = ObjectCleaner(self.objects_parsed, self.detected_objects)
        self.object_cleaner.start()

        # start a thread to refine regions when objects are clipped
        self.dynamic_region_fps = EventsPerSecond()
        self.region_refiner = RegionRefiner(self)
        self.region_refiner.start()
        self.dynamic_region_fps.start()

        # start a thread to track objects
        self.object_tracker = ObjectTracker(self, 10)
        self.object_tracker.start()

        # start a thread to write tracked frames to disk
        self.video_writer = VideoWriter(self)
        self.video_writer.start()

        # start a thread to publish object scores
        mqtt_publisher = MqttObjectPublisher(self.mqtt_client, self.mqtt_topic_prefix, self.objects_parsed, self.detected_objects, self.best_frames)
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
            
        # create the process to capture frames from the input stream and store in a shared array
        print("Creating a new ffmpeg process...")
        self.start_ffmpeg()
        
        print("Creating a new capture thread...")
        self.capture_thread = CameraCapture(self)
        print("Starting a new capture thread...")
        self.capture_thread.start()
        self.fps.start()
    
    def start_ffmpeg(self):
        ffmpeg_cmd = (['ffmpeg'] +
            self.ffmpeg_global_args +
            self.ffmpeg_hwaccel_args +
            self.ffmpeg_input_args +
            ['-i', self.ffmpeg_input] +
            self.ffmpeg_output_args +
            ['pipe:'])

        print(" ".join(ffmpeg_cmd))
        
        self.ffmpeg_process = sp.Popen(ffmpeg_cmd, stdout = sp.PIPE, bufsize=self.frame_size)
    
    def start(self):
        self.start_or_restart_capture()
        self.watchdog.start()
    
    def join(self):
        self.capture_thread.join()
    
    def get_capture_pid(self):
        return self.ffmpeg_process.pid
    
    def get_best(self, label):
        return self.best_frames.best_frames.get(label)

    def stats(self):
        return {
            'camera_fps': self.fps.eps(60),
            'resize_queue': self.resize_queue.qsize(),
            'frame_queue': self.frame_queue.qsize(),
            'finished_frame_queue': self.finished_frame_queue.qsize(),
            'refined_frame_queue': self.refined_frame_queue.qsize(),
            'regions_in_process': self.regions_in_process,
            'dynamic_regions_per_sec': self.dynamic_region_fps.eps()
        }
    
    def frame_with_objects(self, frame_time):
        frame = self.frame_cache[frame_time].copy()

        for region in self.regions:
            color = (255,255,255)
            cv2.rectangle(frame, (region['x_offset'], region['y_offset']), 
                (region['x_offset']+region['size'], region['y_offset']+region['size']), 
                color, 2)

        # draw the bounding boxes on the screen
        for id, obj in self.object_tracker.tracked_objects.items():
        # for obj in detected_objects[frame_time]:
            cv2.rectangle(frame, (obj['region']['xmin'], obj['region']['ymin']), 
                (obj['region']['xmax'], obj['region']['ymax']), 
                (0,255,0), 1)
            draw_box_with_label(frame, obj['box']['xmin'], obj['box']['ymin'], obj['box']['xmax'], obj['box']['ymax'], obj['name'], f"{int(obj['score']*100)}% {obj['area']} {id}")
            
        # print a timestamp
        time_to_show = datetime.datetime.fromtimestamp(frame_time).strftime("%m/%d/%Y %H:%M:%S")
        cv2.putText(frame, time_to_show, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)
        
        # print fps
        cv2.putText(frame, str(self.fps.eps())+'FPS', (10, 60), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)

        # convert to BGR
        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        # encode the image into a jpg
        ret, jpg = cv2.imencode('.jpg', frame)

        return jpg.tobytes()

    def get_current_frame_with_objects(self):
        frame_time = self.last_processed_frame
        if frame_time == self.cached_frame_with_objects['frame_time']:
            return self.cached_frame_with_objects['frame_bytes']

        frame_bytes = self.frame_with_objects(frame_time)

        self.cached_frame_with_objects = {
            'frame_bytes': frame_bytes,
            'frame_time': frame_time
        }

        return frame_bytes


    
        
