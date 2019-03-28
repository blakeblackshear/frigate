import os
import cv2
import imutils
import time
import datetime
import ctypes
import logging
import multiprocessing as mp
import queue
import threading
import json
import yaml
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
from frigate.object_detection import FramePrepper, PreppedQueueProcessor

with open('/config/config.yml') as f:
    # use safe_load instead load
    CONFIG = yaml.safe_load(f)

rtsp_camera = CONFIG['cameras']['back']['rtsp']
if (rtsp_camera['password'].startswith('$')):
    rtsp_camera['password'] = os.getenv(rtsp_camera['password'][1:])
RTSP_URL = 'rtsp://{}:{}@{}:{}{}'.format(rtsp_camera['user'], 
    rtsp_camera['password'], rtsp_camera['host'], rtsp_camera['port'],
    rtsp_camera['path'])

MQTT_HOST = CONFIG['mqtt']['host']
MQTT_PORT = CONFIG.get('mqtt', {}).get('port', 1883)
MQTT_TOPIC_PREFIX = CONFIG['mqtt']['topic_prefix'] + '/back'
MQTT_USER = CONFIG.get('mqtt', {}).get('user')
MQTT_PASS = CONFIG.get('mqtt', {}).get('password')

WEB_PORT = CONFIG.get('web_port', 5000)
DEBUG = (CONFIG.get('debug', '0') == '1')

def main():
    DETECTED_OBJECTS = []
    recent_frames = {}
    # Parse selected regions
    regions = CONFIG['cameras']['back']['regions']
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
    # Condition for notifying that objects were parsed
    objects_parsed = mp.Condition()
    # Queue for detected objects
    object_queue = queue.Queue()
    # Queue for prepped frames
    prepped_frame_queue = queue.Queue(len(regions)*2)

    # shape current frame so it can be treated as an image
    frame_arr = tonumpyarray(shared_arr).reshape(frame_shape)

    # start the process to capture frames from the RTSP stream and store in a shared array
    capture_process = mp.Process(target=fetch_frames, args=(shared_arr, 
        shared_frame_time, frame_lock, frame_ready, frame_shape, RTSP_URL))
    capture_process.daemon = True

    # for each region, start a separate thread to resize the region and prep for detection
    detection_prep_threads = []
    for region in regions:
        detection_prep_threads.append(FramePrepper(
            frame_arr,
            shared_frame_time,
            frame_ready,
            frame_lock,
            region['size'], region['x_offset'], region['y_offset'],
            prepped_frame_queue
        ))

    prepped_queue_processor = PreppedQueueProcessor(
        prepped_frame_queue,
        object_queue
    )
    prepped_queue_processor.start()

    # start a thread to store recent motion frames for processing
    frame_tracker = FrameTracker(frame_arr, shared_frame_time, frame_ready, frame_lock, 
        recent_frames)
    frame_tracker.start()

    # start a thread to store the highest scoring recent person frame
    best_person_frame = BestPersonFrame(objects_parsed, recent_frames, DETECTED_OBJECTS)
    best_person_frame.start()

    # start a thread to parse objects from the queue
    object_parser = ObjectParser(object_queue, objects_parsed, DETECTED_OBJECTS, regions)
    object_parser.start()
    # start a thread to expire objects from the detected objects list
    object_cleaner = ObjectCleaner(objects_parsed, DETECTED_OBJECTS)
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

    client.connect(MQTT_HOST, MQTT_PORT, 60)
    client.loop_start()

    # start a thread to publish object scores (currently only person)
    mqtt_publisher = MqttObjectPublisher(client, MQTT_TOPIC_PREFIX, objects_parsed, DETECTED_OBJECTS)
    mqtt_publisher.start()

    # start the process of capturing frames
    capture_process.start()
    print("capture_process pid ", capture_process.pid)

    # start the object detection prep threads
    for detection_prep_thread in detection_prep_threads:
        detection_prep_thread.start()

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
                cv2.rectangle(frame, (region['x_offset'], region['y_offset']), 
                    (region['x_offset']+region['size'], region['y_offset']+region['size']), 
                    color, 2)

            # convert back to BGR
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            # encode the image into a jpg
            ret, jpg = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n\r\n')

    app.run(host='0.0.0.0', port=WEB_PORT, debug=False)

    capture_process.join()
    for detection_prep_thread in detection_prep_threads:
        detection_prep_thread.join()
    frame_tracker.join()
    best_person_frame.join()
    object_parser.join()
    object_cleaner.join()
    mqtt_publisher.join()

if __name__ == '__main__':
    main()