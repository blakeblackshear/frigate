import cv2
import time
import datetime
import queue
import yaml
import threading
import multiprocessing as mp
import subprocess as sp
import numpy as np
import logging
from flask import Flask, Response, make_response, jsonify
import paho.mqtt.client as mqtt

from frigate.video import track_camera
from frigate.object_processing import TrackedObjectProcessor
from frigate.util import EventsPerSecond
from frigate.edgetpu import EdgeTPUProcess

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
        ['-f', 'rawvideo',
         '-pix_fmt', 'rgb24'])
}

GLOBAL_OBJECT_CONFIG = CONFIG.get('objects', {})

WEB_PORT = CONFIG.get('web_port', 5000)
DEBUG = (CONFIG.get('debug', '0') == '1')

class CameraWatchdog(threading.Thread):
    def __init__(self, camera_processes, config, tflite_process, tracked_objects_queue, object_processor):
        threading.Thread.__init__(self)
        self.camera_processes = camera_processes
        self.config = config
        self.tflite_process = tflite_process
        self.tracked_objects_queue = tracked_objects_queue
        self.object_processor = object_processor

    def run(self):
        time.sleep(10)
        while True:
            # wait a bit before checking
            time.sleep(30)

            for name, camera_process in self.camera_processes.items():
                process = camera_process['process']
                if not process.is_alive():
                    print(f"Process for {name} is not alive. Starting again...")
                    camera_process['fps'].value = float(self.config[name]['fps'])
                    camera_process['skipped_fps'].value = 0.0
                    camera_process['detection_fps'].value = 0.0
                    self.object_processor.camera_data[name]['current_frame_time'] = None
                    process = mp.Process(target=track_camera, args=(name, self.config[name], FFMPEG_DEFAULT_CONFIG, GLOBAL_OBJECT_CONFIG, 
                        self.tflite_process.detect_lock, self.tflite_process.detect_ready, self.tflite_process.frame_ready, self.tracked_objects_queue, 
                        camera_process['fps'], camera_process['skipped_fps'], camera_process['detection_fps']))
                    process.daemon = True
                    camera_process['process'] = process
                    process.start()
                    print(f"Camera_process started for {name}: {process.pid}")

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

    # start plasma store
    plasma_cmd = ['plasma_store', '-m', '400000000', '-s', '/tmp/plasma']
    plasma_process = sp.Popen(plasma_cmd, stdout=sp.DEVNULL)
    time.sleep(1)
    rc = plasma_process.poll()
    if rc is not None:
        raise RuntimeError("plasma_store exited unexpectedly with "
                            "code %d" % (rc,))

    ##
    # Setup config defaults for cameras
    ##
    for name, config in CONFIG['cameras'].items():
        config['snapshots'] = {
            'show_timestamp': config.get('snapshots', {}).get('show_timestamp', True)
        }

    # Queue for cameras to push tracked objects to
    tracked_objects_queue = mp.Queue()
    
    # Start the shared tflite process
    tflite_process = EdgeTPUProcess()

    # start the camera processes
    camera_processes = {}
    for name, config in CONFIG['cameras'].items():
        camera_processes[name] = {
            'fps': mp.Value('d', float(config['fps'])),
            'skipped_fps': mp.Value('d', 0.0),
            'detection_fps': mp.Value('d', 0.0)
        }
        camera_process = mp.Process(target=track_camera, args=(name, config, FFMPEG_DEFAULT_CONFIG, GLOBAL_OBJECT_CONFIG, 
            tflite_process.detect_lock, tflite_process.detect_ready, tflite_process.frame_ready, tracked_objects_queue, 
            camera_processes[name]['fps'], camera_processes[name]['skipped_fps'], camera_processes[name]['detection_fps']))
        camera_process.daemon = True
        camera_processes[name]['process'] = camera_process

    for name, camera_process in camera_processes.items():
        camera_process['process'].start()
        print(f"Camera_process started for {name}: {camera_process['process'].pid}")
    
    object_processor = TrackedObjectProcessor(CONFIG['cameras'], client, MQTT_TOPIC_PREFIX, tracked_objects_queue)
    object_processor.start()
    
    camera_watchdog = CameraWatchdog(camera_processes, CONFIG['cameras'], tflite_process, tracked_objects_queue, object_processor)
    camera_watchdog.start()

    # create a flask app that encodes frames a mjpeg on demand
    app = Flask(__name__)
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)

    @app.route('/')
    def ishealthy():
        # return a healh
        return "Frigate is running. Alive and healthy!"

    @app.route('/debug/stats')
    def stats():
        stats = {}

        total_detection_fps = 0

        for name, camera_stats in camera_processes.items():
            total_detection_fps += camera_stats['detection_fps'].value
            stats[name] = {
                'fps': camera_stats['fps'].value,
                'skipped_fps': camera_stats['skipped_fps'].value,
                'detection_fps': camera_stats['detection_fps'].value
            }
        
        stats['coral'] = {
            'fps': total_detection_fps,
            'inference_speed': round(tflite_process.avg_inference_speed.value*1000, 2)
        }

        rc = plasma_process.poll()
        stats['plasma_store_rc'] = rc

        stats['tracked_objects_queue'] = tracked_objects_queue.qsize()

        return jsonify(stats)

    @app.route('/<camera_name>/<label>/best.jpg')
    def best(camera_name, label):
        if camera_name in CONFIG['cameras']:
            best_frame = object_processor.get_best(camera_name, label)
            if best_frame is None:
                best_frame = np.zeros((720,1280,3), np.uint8)
            best_frame = cv2.cvtColor(best_frame, cv2.COLOR_RGB2BGR)
            ret, jpg = cv2.imencode('.jpg', best_frame)
            response = make_response(jpg.tobytes())
            response.headers['Content-Type'] = 'image/jpg'
            return response
        else:
            return "Camera named {} not found".format(camera_name), 404

    @app.route('/<camera_name>')
    def mjpeg_feed(camera_name):
        if camera_name in CONFIG['cameras']:
            # return a multipart response
            return Response(imagestream(camera_name),
                            mimetype='multipart/x-mixed-replace; boundary=frame')
        else:
            return "Camera named {} not found".format(camera_name), 404

    def imagestream(camera_name):
        while True:
            # max out at 1 FPS
            time.sleep(1)
            frame = object_processor.get_current_frame(camera_name)
            if frame is None:
                frame = np.zeros((720,1280,3), np.uint8)
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            ret, jpg = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n\r\n')

    app.run(host='0.0.0.0', port=WEB_PORT, debug=False)

    camera_watchdog.join()
    
    plasma_process.terminate()

if __name__ == '__main__':
    main()
