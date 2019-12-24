import os
import time
import datetime
import cv2
import threading
import ctypes
import multiprocessing as mp
import subprocess as sp
import numpy as np
from . util import tonumpyarray, draw_box_with_label
from . object_detection import FramePrepper
from . objects import ObjectCleaner, BestPersonFrame
from . mqtt import MqttObjectPublisher

# Stores 2 seconds worth of frames when motion is detected so they can be used for other threads
class FrameTracker(threading.Thread):
    def __init__(self, shared_frame, frame_time, frame_ready, frame_lock, recent_frames):
        threading.Thread.__init__(self)
        self.shared_frame = shared_frame
        self.frame_time = frame_time
        self.frame_ready = frame_ready
        self.frame_lock = frame_lock
        self.recent_frames = recent_frames

    def run(self):
        frame_time = 0.0
        while True:
            now = datetime.datetime.now().timestamp()
            # wait for a frame
            with self.frame_ready:
                # if there isnt a frame ready for processing or it is old, wait for a signal
                if self.frame_time.value == frame_time or (now - self.frame_time.value) > 0.5:
                    self.frame_ready.wait()
            
            # lock and make a copy of the frame
            with self.frame_lock: 
                frame = self.shared_frame.copy()
                frame_time = self.frame_time.value
            
            # add the frame to recent frames
            self.recent_frames[frame_time] = frame

            # delete any old frames
            stored_frame_times = list(self.recent_frames.keys())
            for k in stored_frame_times:
                if (now - k) > 2:
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

        while True:
            # wait a bit before checking
            time.sleep(10)

            if (datetime.datetime.now().timestamp() - self.camera.frame_time.value) > 10:
                print("last frame is more than 10 seconds old, restarting camera capture...")
                self.camera.start_or_restart_capture()
                time.sleep(5)

# Thread to read the stdout of the ffmpeg process and update the current frame
class CameraCapture(threading.Thread):
    def __init__(self, camera):
        threading.Thread.__init__(self)
        self.camera = camera

    def run(self):
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
                self.camera.frame_time.value = datetime.datetime.now().timestamp()
                
                self.camera.current_frame[:] = (
                    np
                    .frombuffer(raw_image, np.uint8)
                    .reshape(self.camera.frame_shape)
                )
            # Notify with the condition that a new frame is ready
            with self.camera.frame_ready:
                self.camera.frame_ready.notify_all()

class Camera:
    def __init__(self, name, ffmpeg_config, config, prepped_frame_queue, mqtt_client, mqtt_prefix):
        self.name = name
        self.config = config
        self.detected_objects = []
        self.recent_frames = {}

        self.ffmpeg = config.get('ffmpeg', {})
        self.ffmpeg_input = get_ffmpeg_input(self.ffmpeg['input'])
        self.ffmpeg_global_args = self.ffmpeg.get('global_args', ffmpeg_config['global_args'])
        self.ffmpeg_hwaccel_args = self.ffmpeg.get('hwaccel_args', ffmpeg_config['hwaccel_args'])
        self.ffmpeg_input_args = self.ffmpeg.get('input_args', ffmpeg_config['input_args'])
        self.ffmpeg_output_args = self.ffmpeg.get('output_args', ffmpeg_config['output_args'])

        self.take_frame = self.config.get('take_frame', 1)
        self.regions = self.config['regions']
        self.frame_shape = get_frame_shape(self.ffmpeg_input)
        self.frame_size = self.frame_shape[0] * self.frame_shape[1] * self.frame_shape[2]
        self.mqtt_client = mqtt_client
        self.mqtt_topic_prefix = '{}/{}'.format(mqtt_prefix, self.name)
        self.label = config.get('label', 'person')

        # create a numpy array for the current frame in initialize to zeros
        self.current_frame = np.zeros(self.frame_shape, np.uint8)
        # create shared value for storing the frame_time
        self.frame_time = mp.Value('d', 0.0)
        # Lock to control access to the frame
        self.frame_lock = mp.Lock()
        # Condition for notifying that a new frame is ready
        self.frame_ready = mp.Condition()
        # Condition for notifying that objects were parsed
        self.objects_parsed = mp.Condition()

        self.ffmpeg_process = None
        self.capture_thread = None

        # for each region, create a separate thread to resize the region and prep for detection
        self.detection_prep_threads = []
        for region in self.config['regions']:
            # set a default threshold of 0.5 if not defined
            if not 'threshold' in region:
                region['threshold'] = 0.5
            if not isinstance(region['threshold'], float):
                print('Threshold is not a float. Setting to 0.5 default.')
                region['threshold'] = 0.5
            self.detection_prep_threads.append(FramePrepper(
                self.name,
                self.current_frame,
                self.frame_time,
                self.frame_ready,
                self.frame_lock,
                region['size'], region['x_offset'], region['y_offset'], region['threshold'],
                prepped_frame_queue
            ))
        
        # start a thread to store recent motion frames for processing
        self.frame_tracker = FrameTracker(self.current_frame, self.frame_time, 
            self.frame_ready, self.frame_lock, self.recent_frames)
        self.frame_tracker.start()

        # start a thread to store the highest scoring recent person frame
        self.best_person_frame = BestPersonFrame(self.objects_parsed, self.recent_frames, self.detected_objects, self.label)
        self.best_person_frame.start()

        # start a thread to expire objects from the detected objects list
        self.object_cleaner = ObjectCleaner(self.objects_parsed, self.detected_objects)
        self.object_cleaner.start()

        # start a thread to publish object scores (currently only person)
        mqtt_publisher = MqttObjectPublisher(self.mqtt_client, self.mqtt_topic_prefix, self.objects_parsed, self.detected_objects, self.best_person_frame, self.label)
        mqtt_publisher.start()

        # create a watchdog thread for capture process
        self.watchdog = CameraWatchdog(self)

        # load in the mask for person detection
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
        # start the object detection prep threads
        for detection_prep_thread in self.detection_prep_threads:
            detection_prep_thread.start()
        self.watchdog.start()
    
    def join(self):
        self.capture_thread.join()
    
    def get_capture_pid(self):
        return self.ffmpeg_process.pid
    
    def add_objects(self, objects):
        if len(objects) == 0:
            return

        for obj in objects:
            # Store object area to use in bounding box labels
            obj['area'] = (obj['xmax']-obj['xmin'])*(obj['ymax']-obj['ymin'])

            if obj['name'] == self.label:
                # find the matching region
                region = None
                for r in self.regions:
                    if (
                            obj['xmin'] >= r['x_offset'] and
                            obj['ymin'] >= r['y_offset'] and
                            obj['xmax'] <= r['x_offset']+r['size'] and
                            obj['ymax'] <= r['y_offset']+r['size']
                        ): 
                        region = r
                        break
                
                # if the min person area is larger than the
                # detected person, don't add it to detected objects
                if region and 'min_person_area' in region and region['min_person_area'] > obj['area']:
                    continue
                
                # if the detected person is larger than the
                # max person area, don't add it to detected objects
                if region and 'max_person_area' in region and region['max_person_area'] < obj['area']:
                    continue
            
                # compute the coordinates of the person and make sure
                # the location isnt outside the bounds of the image (can happen from rounding)
                y_location = min(int(obj['ymax']), len(self.mask)-1)
                x_location = min(int((obj['xmax']-obj['xmin'])/2.0)+obj['xmin'], len(self.mask[0])-1)

                # if the person is in a masked location, continue
                if self.mask[y_location][x_location] == [0]:
                    continue

            self.detected_objects.append(obj)

        with self.objects_parsed:
            self.objects_parsed.notify_all()

    def get_best_person(self):
        return self.best_person_frame.best_frame
    
    def get_current_frame_with_objects(self):
        # make a copy of the current detected objects
        detected_objects = self.detected_objects.copy()
        # lock and make a copy of the current frame
        with self.frame_lock:
            frame = self.current_frame.copy()
            frame_time = self.frame_time.value

        # draw the bounding boxes on the screen
        for obj in detected_objects:
            label = "{}: {}% {}".format(obj['name'],int(obj['score']*100),int(obj['area']))
            draw_box_with_label(frame, obj['xmin'], obj['ymin'], obj['xmax'], obj['ymax'], label)

        for region in self.regions:
            color = (255,255,255)
            cv2.rectangle(frame, (region['x_offset'], region['y_offset']), 
                (region['x_offset']+region['size'], region['y_offset']+region['size']), 
                color, 2)
        
        # print a timestamp
        time_to_show = datetime.datetime.fromtimestamp(frame_time).strftime("%m/%d/%Y %H:%M:%S")
        cv2.putText(frame, time_to_show, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, fontScale=.8, color=(255, 255, 255), thickness=2)

        # convert to BGR
        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        return frame


    
        
