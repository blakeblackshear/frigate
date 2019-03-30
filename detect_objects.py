import cv2
import time
import queue
import yaml
import numpy as np
from flask import Flask, Response, make_response
import paho.mqtt.client as mqtt

from frigate.video import Camera
from frigate.object_detection import PreppedQueueProcessor

with open('/config/config.yml') as f:
    CONFIG = yaml.safe_load(f)

MQTT_HOST = CONFIG['mqtt']['host']
MQTT_PORT = CONFIG.get('mqtt', {}).get('port', 1883)
MQTT_TOPIC_PREFIX = CONFIG.get('mqtt', {}).get('topic_prefix', 'frigate')
MQTT_USER = CONFIG.get('mqtt', {}).get('user')
MQTT_PASS = CONFIG.get('mqtt', {}).get('password')

WEB_PORT = CONFIG.get('web_port', 5000)
DEBUG = (CONFIG.get('debug', '0') == '1')

def main():
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
    
    # Queue for prepped frames, max size set to (number of cameras * 5)
    max_queue_size = len(CONFIG['cameras'].items())*5
    prepped_frame_queue = queue.Queue(max_queue_size)

    cameras = {}
    for name, config in CONFIG['cameras'].items():
        cameras[name] = Camera(name, config, prepped_frame_queue, client, MQTT_TOPIC_PREFIX)

    prepped_queue_processor = PreppedQueueProcessor(
        cameras,
        prepped_frame_queue
    )
    prepped_queue_processor.start()

    for name, camera in cameras.items():
        camera.start()
        print("Capture process for {}: {}".format(name, camera.get_capture_pid()))

    # create a flask app that encodes frames a mjpeg on demand
    app = Flask(__name__)

    @app.route('/<camera_name>/best_person.jpg')
    def best_person(camera_name):
        best_person_frame = cameras[camera_name].get_best_person()
        if best_person_frame is None:
            best_person_frame = np.zeros((720,1280,3), np.uint8)
        ret, jpg = cv2.imencode('.jpg', best_person_frame)
        response = make_response(jpg.tobytes())
        response.headers['Content-Type'] = 'image/jpg'
        return response

    @app.route('/<camera_name>')
    def mjpeg_feed(camera_name):
        # return a multipart response
        return Response(imagestream(camera_name),
                        mimetype='multipart/x-mixed-replace; boundary=frame')

    def imagestream(camera_name):
        while True:
            # max out at 5 FPS
            time.sleep(0.2)
            frame = cameras[camera_name].get_current_frame_with_objects()
            # encode the image into a jpg
            ret, jpg = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n\r\n')

    app.run(host='0.0.0.0', port=WEB_PORT, debug=False)

    camera.join()

if __name__ == '__main__':
    main()