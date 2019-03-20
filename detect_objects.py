import os
import cv2
import imutils
import time
import datetime
import ctypes
import logging
import multiprocessing as mp
import threading
import json
from contextlib import closing
import numpy as np
from object_detection.utils import visualization_utils as vis_util
from flask import Flask, Response, make_response, send_file
import paho.mqtt.client as mqtt

from frigate.util import tonumpyarray
from frigate.mqtt import MqttMotionPublisher, MqttObjectPublisher
from frigate.objects import ObjectParser, ObjectCleaner, BestPersonFrame
from frigate.motion import detect_motion
from frigate.video import fetch_frames, FrameTracker
from frigate.object_detection import prep_for_detection, detect_objects

RTSP_URL = os.getenv('RTSP_URL')

MQTT_HOST = os.getenv('MQTT_HOST')
MQTT_USER = os.getenv('MQTT_USER')
MQTT_PASS = os.getenv('MQTT_PASS')
MQTT_TOPIC_PREFIX = os.getenv('MQTT_TOPIC_PREFIX')

# REGIONS = "350,0,300,50:400,350,250,50:400,750,250,50"
# REGIONS = "400,350,250,50"
REGIONS = os.getenv('REGIONS')

DEBUG = (os.getenv('DEBUG') == '1')

def main():
    DETECTED_OBJECTS = []
    recent_motion_frames = {}
    # Parse selected regions
    regions = []
    for region_string in REGIONS.split(':'):
        region_parts = region_string.split(',')
        region_mask_image = cv2.imread("/config/{}".format(region_parts[5]), cv2.IMREAD_GRAYSCALE)
        region_mask = np.where(region_mask_image==[0])
        regions.append({
            'size': int(region_parts[0]),
            'x_offset': int(region_parts[1]),
            'y_offset': int(region_parts[2]),
            'min_person_area': int(region_parts[3]),
            'min_object_size': int(region_parts[4]),
            'mask': region_mask,
            # Event for motion detection signaling
            'motion_detected': mp.Event(),
            # array for prepped frame with shape (1, 300, 300, 3)
            'prepped_frame_array': mp.Array(ctypes.c_uint8, 300*300*3),
            # shared value for storing the prepped_frame_time
            'prepped_frame_time': mp.Value('d', 0.0),
            # Lock to control access to the prepped frame
            'prepped_frame_lock': mp.Lock()
        })
    # capture a single frame and check the frame shape so the correct array
    # size can be allocated in memory
    video = cv2.VideoCapture(RTSP_URL)
    ret, frame = video.read()
    if ret:
        frame_shape = frame.shape
    else:
        print("Unable to capture video stream")
        exit(1)
    video.release()
        
    # compute the flattened array length from the array shape
    flat_array_length = frame_shape[0] * frame_shape[1] * frame_shape[2]
    # create shared array for storing the full frame image data
    shared_arr = mp.Array(ctypes.c_uint8, flat_array_length)
    # create shared value for storing the frame_time
    shared_frame_time = mp.Value('d', 0.0)
    # Lock to control access to the frame
    frame_lock = mp.Lock()
    # Condition for notifying that a new frame is ready
    frame_ready = mp.Condition()
    # Condition for notifying that motion status changed globally
    motion_changed = mp.Condition()
    # Condition for notifying that objects were parsed
    objects_parsed = mp.Condition()
    # Queue for detected objects
    object_queue = mp.Queue()

    # shape current frame so it can be treated as an image
    frame_arr = tonumpyarray(shared_arr).reshape(frame_shape)

    # start the process to capture frames from the RTSP stream and store in a shared array
    capture_process = mp.Process(target=fetch_frames, args=(shared_arr, 
        shared_frame_time, frame_lock, frame_ready, frame_shape, RTSP_URL))
    capture_process.daemon = True

    # for each region, start a separate process for motion detection and object detection
    detection_prep_processes = []
    motion_processes = []
    for region in regions:
        # possibly try putting these on threads and putting prepped
        # frames in a queue
        detection_prep_process = mp.Process(target=prep_for_detection, args=(shared_arr, 
            shared_frame_time,
            frame_lock, frame_ready,
            region['motion_detected'],
            frame_shape, 
            region['size'], region['x_offset'], region['y_offset'],
            region['prepped_frame_array'], region['prepped_frame_time'],
            region['prepped_frame_lock']))
        detection_prep_process.daemon = True
        detection_prep_processes.append(detection_prep_process)

        motion_process = mp.Process(target=detect_motion, args=(shared_arr,
            shared_frame_time,
            frame_lock, frame_ready,
            region['motion_detected'],
            motion_changed,
            frame_shape, 
            region['size'], region['x_offset'], region['y_offset'],
            region['min_object_size'], region['mask'],
            DEBUG))
        motion_process.daemon = True
        motion_processes.append(motion_process)

    # create a process for object detection
    detection_process = mp.Process(target=detect_objects, args=(
        [region['prepped_frame_array'] for region in regions],
        [region['prepped_frame_time'] for region in regions],
        [region['prepped_frame_lock'] for region in regions],
        [[region['size'], region['x_offset'], region['y_offset']] for region in regions],
        motion_changed, [region['motion_detected'] for region in regions],
        object_queue, DEBUG
    ))
    detection_process.daemon = True

    # start a thread to store recent motion frames for processing
    frame_tracker = FrameTracker(frame_arr, shared_frame_time, frame_ready, frame_lock, 
        recent_motion_frames, motion_changed, [region['motion_detected'] for region in regions])
    frame_tracker.start()

    # start a thread to store the highest scoring recent person frame
    best_person_frame = BestPersonFrame(objects_parsed, recent_motion_frames, DETECTED_OBJECTS, 
        motion_changed, [region['motion_detected'] for region in regions])
    best_person_frame.start()

    # start a thread to parse objects from the queue
    object_parser = ObjectParser(object_queue, objects_parsed, DETECTED_OBJECTS)
    object_parser.start()
    # start a thread to expire objects from the detected objects list
    object_cleaner = ObjectCleaner(objects_parsed, DETECTED_OBJECTS,
        motion_changed, [region['motion_detected'] for region in regions])
    object_cleaner.start()

    # connect to mqtt and setup last will
    def on_connect(client, userdata, flags, rc): 
        print("On connect called")
        # publish a message to signal that the service is running
        client.publish(MQTT_TOPIC_PREFIX+'/available', 'online', retain=True)
    client = mqtt.Client()
    client.on_connect = on_connect
    client.will_set(MQTT_TOPIC_PREFIX+'/available', payload='offline', qos=1, retain=True)
    if not MQTT_USER is None:
        client.username_pw_set(MQTT_USER, password=MQTT_PASS)

    client.connect(MQTT_HOST, 1883, 60)
    client.loop_start()

    # start a thread to publish object scores (currently only person)
    mqtt_publisher = MqttObjectPublisher(client, MQTT_TOPIC_PREFIX, objects_parsed, DETECTED_OBJECTS)
    mqtt_publisher.start()

    # start thread to publish motion status
    mqtt_motion_publisher = MqttMotionPublisher(client, MQTT_TOPIC_PREFIX, motion_changed,
        [region['motion_detected'] for region in regions])
    mqtt_motion_publisher.start()

    # start the process of capturing frames
    capture_process.start()
    print("capture_process pid ", capture_process.pid)

    # start the object detection prep processes
    for detection_prep_process in detection_prep_processes:
        detection_prep_process.start()
        print("detection_prep_process pid ", detection_prep_process.pid)
    
    detection_process.start()
    print("detection_process pid ", detection_process.pid)
    
    # start the motion detection processes
    # for motion_process in motion_processes:
    #     motion_process.start()
    #     print("motion_process pid ", motion_process.pid)

    # TEMP: short circuit the motion detection
    for region in regions:
        region['motion_detected'].set()
    with motion_changed:
        motion_changed.notify_all()

    # create a flask app that encodes frames a mjpeg on demand
    app = Flask(__name__)

    @app.route('/best_person.jpg')
    def best_person():
        frame = np.zeros(frame_shape, np.uint8) if best_person_frame.best_frame is None else best_person_frame.best_frame
        ret, jpg = cv2.imencode('.jpg', frame)
        response = make_response(jpg.tobytes())
        response.headers['Content-Type'] = 'image/jpg'
        return response

    @app.route('/')
    def index():
        # return a multipart response
        return Response(imagestream(),
                        mimetype='multipart/x-mixed-replace; boundary=frame')
    def imagestream():
        while True:
            # max out at 5 FPS
            time.sleep(0.2)
            # make a copy of the current detected objects
            detected_objects = DETECTED_OBJECTS.copy()
            # lock and make a copy of the current frame
            with frame_lock:
                frame = frame_arr.copy()
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

            for region in regions:
                color = (255,255,255)
                if region['motion_detected'].is_set():
                    color = (0,255,0)
                cv2.rectangle(frame, (region['x_offset'], region['y_offset']), 
                    (region['x_offset']+region['size'], region['y_offset']+region['size']), 
                    color, 2)

            # convert back to BGR
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            # encode the image into a jpg
            ret, jpg = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n\r\n')

    app.run(host='0.0.0.0', debug=False)

    capture_process.join()
    for detection_prep_process in detection_prep_processes:
        detection_prep_process.join()
    for motion_process in motion_processes:
        motion_process.join()
    detection_process.join()
    frame_tracker.join()
    best_person_frame.join()
    object_parser.join()
    object_cleaner.join()
    mqtt_publisher.join()

if __name__ == '__main__':
    main()