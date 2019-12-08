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
MQTT_CLIENT_ID = CONFIG.get('mqtt', {}).get('client_id', 'frigate')

# Set the default FFmpeg config
FFMPEG_CONFIG = CONFIG.get('ffmpeg', {})
FFMPEG_DEFAULT_CONFIG = {
    'global_args': FFMPEG_CONFIG.get('global_args', 
        ['-hide_banner','-loglevel','panic']),
    'hwaccel_args': FFMPEG_CONFIG.get('hwaccel_args', 
        []),
    'input_args': FFMPEG_CONFIG.get('input_args',
        ['-avoid_negative_ts', 'make_zero',
         '-fflags', 'nobuffer',
         '-flags', 'low_delay',
         '-strict', 'experimental',
         '-fflags', '+genpts+discardcorrupt',
         '-vsync', 'drop',
         '-rtsp_transport', 'tcp',
         '-stimeout', '5000000',
         '-use_wallclock_as_timestamps', '1']),
    'output_args': FFMPEG_CONFIG.get('output_args',
        ['-vf', 'mpdecimate',
         '-f', 'rawvideo',
         '-pix_fmt', 'rgb24'])
}

WEB_PORT = CONFIG.get('web_port', 5000)
DEBUG = (CONFIG.get('debug', '0') == '1')

def main():
    # connect to mqtt and setup last will
    def on_connect(client, userdata, flags, rc):
        print("On connect called")
        if rc != 0:
            if rc == 3:
                print ("MQTT Server unavailable")
            elif rc == 4:
                print ("MQTT Bad username or password")
            elif rc == 5:
                print ("MQTT Not authorized")
            else:
                print ("Unable to connect to MQTT: Connection refused. Error code: " + str(rc))
        # publish a message to signal that the service is running
        client.publish(MQTT_TOPIC_PREFIX+'/available', 'online', retain=True)
    client = mqtt.Client(client_id=MQTT_CLIENT_ID)
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
        cameras[name] = Camera(name, FFMPEG_DEFAULT_CONFIG, config, prepped_frame_queue, client, MQTT_TOPIC_PREFIX)

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

    @app.route('/')
    def ishealthy():
        # return a healh
        return "Frigate is running. Alive and healthy!"

    @app.route('/<camera_name>/best_person.jpg')
    def best_person(camera_name):
        if camera_name in cameras:
            best_person_frame = cameras[camera_name].get_best_person()
            if best_person_frame is None:
                best_person_frame = np.zeros((720,1280,3), np.uint8)
            ret, jpg = cv2.imencode('.jpg', best_person_frame)
            response = make_response(jpg.tobytes())
            response.headers['Content-Type'] = 'image/jpg'
            return response
        else:
            return f'Camera named {camera_name} not found', 404

    @app.route('/<camera_name>')
    def mjpeg_feed(camera_name):
        if camera_name in cameras:
            # return a multipart response
            return Response(imagestream(camera_name),
                            mimetype='multipart/x-mixed-replace; boundary=frame')
        else:
            return f'Camera named {camera_name} not found', 404

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
