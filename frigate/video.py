import os
import time
import datetime
import cv2
import threading
import ctypes
import multiprocessing as mp
import numpy as np
from object_detection.utils import visualization_utils as vis_util
from . util import tonumpyarray
from . object_detection import FramePrepper
from . objects import ObjectCleaner, BestPersonFrame
from . mqtt import MqttObjectPublisher

# fetch the frames as fast a possible and store current frame in a shared memory array
def fetch_frames(shared_arr, shared_frame_time, frame_lock, frame_ready, frame_shape, rtsp_url):
    # convert shared memory array into numpy and shape into image array
    arr = tonumpyarray(shared_arr).reshape(frame_shape)

    # start the video capture
    video = cv2.VideoCapture()
    video.open(rtsp_url)
    # keep the buffer small so we minimize old data
    video.set(cv2.CAP_PROP_BUFFERSIZE,1)

    bad_frame_counter = 0
    while True:
        # check if the video stream is still open, and reopen if needed
        if not video.isOpened():
            success = video.open(rtsp_url)
            if not success:
                time.sleep(1)
                continue
        # grab the frame, but dont decode it yet
        ret = video.grab()
        # snapshot the time the frame was grabbed
        frame_time = datetime.datetime.now()
        if ret:
            # go ahead and decode the current frame
            ret, frame = video.retrieve()
            if ret:
                # Lock access and update frame
                with frame_lock:
                    arr[:] = frame
                    shared_frame_time.value = frame_time.timestamp()
                # Notify with the condition that a new frame is ready
                with frame_ready:
                    frame_ready.notify_all()
                bad_frame_counter = 0
            else:
                print("Unable to decode frame")
                bad_frame_counter += 1
        else:
            print("Unable to grab a frame")
            bad_frame_counter += 1
        
        if bad_frame_counter > 100:
            video.release()
    
    video.release()

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

def get_frame_shape(rtsp_url):
    # capture a single frame and check the frame shape so the correct array
    # size can be allocated in memory
    video = cv2.VideoCapture(rtsp_url)
    ret, frame = video.read()
    frame_shape = frame.shape
    video.release()
    return frame_shape

def get_rtsp_url(rtsp_config):
    if (rtsp_config['password'].startswith('$')):
        rtsp_config['password'] = os.getenv(rtsp_config['password'][1:])
    return 'rtsp://{}:{}@{}:{}{}'.format(rtsp_config['user'], 
        rtsp_config['password'], rtsp_config['host'], rtsp_config['port'],
        rtsp_config['path'])

class Camera:
    def __init__(self, name, config, prepped_frame_queue, mqtt_client, mqtt_prefix):
        self.name = name
        self.config = config
        self.detected_objects = []
        self.recent_frames = {}
        self.rtsp_url = get_rtsp_url(self.config['rtsp'])
        self.regions = self.config['regions']
        self.frame_shape = get_frame_shape(self.rtsp_url)
        self.mqtt_client = mqtt_client
        self.mqtt_topic_prefix = '{}/{}'.format(mqtt_prefix, self.name)

        # compute the flattened array length from the shape of the frame
        flat_array_length = self.frame_shape[0] * self.frame_shape[1] * self.frame_shape[2]
        # create shared array for storing the full frame image data
        self.shared_frame_array = mp.Array(ctypes.c_uint8, flat_array_length)
        # create shared value for storing the frame_time
        self.shared_frame_time = mp.Value('d', 0.0)
        # Lock to control access to the frame
        self.frame_lock = mp.Lock()
        # Condition for notifying that a new frame is ready
        self.frame_ready = mp.Condition()
        # Condition for notifying that objects were parsed
        self.objects_parsed = mp.Condition()

        # shape current frame so it can be treated as a numpy image
        self.shared_frame_np = tonumpyarray(self.shared_frame_array).reshape(self.frame_shape)

        # create the process to capture frames from the RTSP stream and store in a shared array
        self.capture_process = mp.Process(target=fetch_frames, args=(self.shared_frame_array, 
            self.shared_frame_time, self.frame_lock, self.frame_ready, self.frame_shape, self.rtsp_url))
        self.capture_process.daemon = True

        # for each region, create a separate thread to resize the region and prep for detection
        self.detection_prep_threads = []
        for region in self.config['regions']:
            self.detection_prep_threads.append(FramePrepper(
                self.name,
                self.shared_frame_np,
                self.shared_frame_time,
                self.frame_ready,
                self.frame_lock,
                region['size'], region['x_offset'], region['y_offset'],
                prepped_frame_queue
            ))
        
        # start a thread to store recent motion frames for processing
        self.frame_tracker = FrameTracker(self.shared_frame_np, self.shared_frame_time, 
            self.frame_ready, self.frame_lock, self.recent_frames)
        self.frame_tracker.start()

        # start a thread to store the highest scoring recent person frame
        self.best_person_frame = BestPersonFrame(self.objects_parsed, self.recent_frames, self.detected_objects)
        self.best_person_frame.start()

        # start a thread to expire objects from the detected objects list
        self.object_cleaner = ObjectCleaner(self.objects_parsed, self.detected_objects)
        self.object_cleaner.start()

        # start a thread to publish object scores (currently only person)
        mqtt_publisher = MqttObjectPublisher(self.mqtt_client, self.mqtt_topic_prefix, self.objects_parsed, self.detected_objects)
        mqtt_publisher.start()

        # load in the mask for person detection
        if 'mask' in self.config:
            self.mask = cv2.imread("/config/{}".format(self.config['mask']), cv2.IMREAD_GRAYSCALE)
        else:
            self.mask = np.zeros((self.frame_shape[0], self.frame_shape[1], 1), np.uint8)
            self.mask[:] = 255
    
    def start(self):
        self.capture_process.start()
        # start the object detection prep threads
        for detection_prep_thread in self.detection_prep_threads:
            detection_prep_thread.start()
    
    def join(self):
        self.capture_process.join()
    
    def get_capture_pid(self):
        return self.capture_process.pid
    
    def add_objects(self, objects):
        if len(objects) == 0:
            return

        for obj in objects:
            if obj['name'] == 'person':
                person_area = (obj['xmax']-obj['xmin'])*(obj['ymax']-obj['ymin'])
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
                if region and region['min_person_area'] > person_area:
                    continue
            
                # compute the coordinates of the person and make sure
                # the location isnt outide the bounds of the image (can happen from rounding)
                y_location = min(int(obj['ymax']), len(self.mask)-1)
                x_location = min(int((obj['xmax']-obj['xmin'])/2.0), len(self.mask[0])-1)

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
            frame = self.shared_frame_np.copy()

        # convert to RGB for drawing
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        # draw the bounding boxes on the screen
        for obj in detected_objects:
            vis_util.draw_bounding_box_on_image_array(frame,
                obj['ymin'],
                obj['xmin'],
                obj['ymax'],
                obj['xmax'],
                color='red',
                thickness=2,
                display_str_list=["{}: {}%".format(obj['name'],int(obj['score']*100))],
                use_normalized_coordinates=False)

        for region in self.regions:
            color = (255,255,255)
            cv2.rectangle(frame, (region['x_offset'], region['y_offset']), 
                (region['x_offset']+region['size'], region['y_offset']+region['size']), 
                color, 2)

        # convert back to BGR
        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        return frame


    
        