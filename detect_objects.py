import faulthandler; faulthandler.enable()
import os
import signal
import sys
import traceback
import signal
import cv2
import time
import datetime
import queue
import yaml
import json
import threading
import multiprocessing as mp
import subprocess as sp
import numpy as np
import logging
from flask import Flask, Response, make_response, jsonify, request
import paho.mqtt.client as mqtt
from peewee import *
from playhouse.shortcuts import model_to_dict
from playhouse.sqlite_ext import *
from playhouse.flask_utils import FlaskDB

from frigate.video import capture_camera, track_camera, get_ffmpeg_input, get_frame_shape, CameraCapture, start_or_restart_ffmpeg
from frigate.object_processing import TrackedObjectProcessor
from frigate.events import EventProcessor
from frigate.util import EventsPerSecond
from frigate.edgetpu import EdgeTPUProcess

FRIGATE_VARS = {k: v for k, v in os.environ.items() if k.startswith('FRIGATE_')}

CONFIG_FILE = os.environ.get('CONFIG_FILE', '/config/config.yml')

if CONFIG_FILE.endswith(".yml"):
    with open(CONFIG_FILE) as f:
        CONFIG = yaml.safe_load(f)
elif CONFIG_FILE.endswith(".json"):
    with open(CONFIG_FILE) as f:
        CONFIG = json.load(f)

CACHE_DIR = CONFIG.get('save_clips', {}).get('cache_dir', '/cache')
CLIPS_DIR = CONFIG.get('save_clips', {}).get('clips_dir', '/clips')

if not os.path.exists(CACHE_DIR) and not os.path.islink(CACHE_DIR):
    os.makedirs(CACHE_DIR)
if not os.path.exists(CLIPS_DIR) and not os.path.islink(CLIPS_DIR):
    os.makedirs(CLIPS_DIR)

DATABASE = f"sqliteext:///{os.path.join(CLIPS_DIR, 'frigate.db')}"

MQTT_HOST = CONFIG['mqtt']['host']
MQTT_PORT = CONFIG.get('mqtt', {}).get('port', 1883)
MQTT_TOPIC_PREFIX = CONFIG.get('mqtt', {}).get('topic_prefix', 'frigate')
MQTT_USER = CONFIG.get('mqtt', {}).get('user')
MQTT_PASS = CONFIG.get('mqtt', {}).get('password')
if not MQTT_PASS is None:
    MQTT_PASS = MQTT_PASS.format(**FRIGATE_VARS)
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
         '-rtsp_transport', 'tcp',
         '-stimeout', '5000000',
         '-use_wallclock_as_timestamps', '1']),
    'output_args': FFMPEG_CONFIG.get('output_args',
        ['-f', 'rawvideo',
         '-pix_fmt', 'yuv420p'])
}

GLOBAL_OBJECT_CONFIG = CONFIG.get('objects', {})

WEB_PORT = CONFIG.get('web_port', 5000)
DETECTORS = CONFIG.get('detectors', {'coral': {'type': 'edgetpu', 'device': 'usb'}})

# create a flask app
app = Flask(__name__)
app.config.from_object(__name__)
flask_db = FlaskDB(app)
db = flask_db.database
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)
peewee_log = logging.getLogger('peewee')
peewee_log.addHandler(logging.StreamHandler())
peewee_log.setLevel(logging.DEBUG)

class Event(flask_db.Model):
    id = CharField(null=False, primary_key=True, max_length=30)
    label = CharField(index=True, max_length=20)
    camera = CharField(index=True, max_length=20)
    start_time = DateTimeField()
    end_time = DateTimeField()
    top_score = FloatField()
    false_positive = BooleanField()
    zones = JSONField()

def init_db():
    db.create_tables([Event], safe=True)

class FrigateWatchdog(threading.Thread):
    def __init__(self, camera_processes, config, detectors, detection_queue, out_events, tracked_objects_queue, stop_event):
        threading.Thread.__init__(self)
        self.camera_processes = camera_processes
        self.config = config
        self.detectors = detectors
        self.detection_queue = detection_queue
        self.out_events = out_events
        self.tracked_objects_queue = tracked_objects_queue
        self.stop_event = stop_event

    def run(self):
        time.sleep(10)
        while True:
            # wait a bit before checking
            time.sleep(10)

            if self.stop_event.is_set():
                print(f"Exiting watchdog...")
                break

            now = datetime.datetime.now().timestamp()

            # check the detection processes
            for detector in self.detectors.values():
                detection_start = detector.detection_start.value
                if (detection_start > 0.0 and 
                    now - detection_start > 10):
                    print("Detection appears to be stuck. Restarting detection process")
                    detector.start_or_restart()
                elif not detector.detect_process.is_alive():
                    print("Detection appears to have stopped. Restarting detection process")
                    detector.start_or_restart()

            # check the camera processes
            for name, camera_process in self.camera_processes.items():
                process = camera_process['process']
                if not process.is_alive():
                    print(f"Track process for {name} is not alive. Starting again...")
                    camera_process['camera_fps'].value = 0.0
                    camera_process['process_fps'].value = 0.0
                    camera_process['detection_fps'].value = 0.0
                    camera_process['read_start'].value = 0.0
                    process = mp.Process(target=track_camera, args=(name, self.config,
                        self.detection_queue, self.out_events[name], self.tracked_objects_queue, camera_process, self.stop_event))
                    process.daemon = True
                    camera_process['process'] = process
                    process.start()
                    print(f"Track process started for {name}: {process.pid}")

def main():
    stop_event = threading.Event()
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

    ##
    # Setup config defaults for cameras
    ##
    for name, config in CONFIG['cameras'].items():
        config['snapshots'] = {
            'show_timestamp': config.get('snapshots', {}).get('show_timestamp', True),
            'draw_zones': config.get('snapshots', {}).get('draw_zones', False),
            'draw_bounding_boxes': config.get('snapshots', {}).get('draw_bounding_boxes', True)
        }
        config['zones'] = config.get('zones', {})

    # Queue for cameras to push tracked objects to
    tracked_objects_queue = mp.Queue(maxsize=len(CONFIG['cameras'].keys())*2)

    # Queue for clip processing
    event_queue = mp.Queue()

    # create the detection pipes and shms
    out_events = {}
    camera_shms = []
    for name in CONFIG['cameras'].keys():
        out_events[name] = mp.Event()
        shm_in = mp.shared_memory.SharedMemory(name=name, create=True, size=300*300*3)
        shm_out = mp.shared_memory.SharedMemory(name=f"out-{name}", create=True, size=20*6*4)
        camera_shms.append(shm_in)
        camera_shms.append(shm_out)

    detection_queue = mp.Queue()

    detectors = {}
    for name, detector in DETECTORS.items():
        if detector['type'] == 'cpu':
            detectors[name] = EdgeTPUProcess(detection_queue, out_events=out_events, tf_device='cpu')
        if detector['type'] == 'edgetpu':
            detectors[name] = EdgeTPUProcess(detection_queue, out_events=out_events, tf_device=detector['device'])

    # create the camera processes
    camera_process_info = {}
    for name, config in CONFIG['cameras'].items():
        # Merge the ffmpeg config with the global config
        ffmpeg = config.get('ffmpeg', {})
        ffmpeg_input = get_ffmpeg_input(ffmpeg['input'])
        ffmpeg_global_args = ffmpeg.get('global_args', FFMPEG_DEFAULT_CONFIG['global_args'])
        ffmpeg_hwaccel_args = ffmpeg.get('hwaccel_args', FFMPEG_DEFAULT_CONFIG['hwaccel_args'])
        ffmpeg_input_args = ffmpeg.get('input_args', FFMPEG_DEFAULT_CONFIG['input_args'])
        ffmpeg_output_args = ffmpeg.get('output_args', FFMPEG_DEFAULT_CONFIG['output_args'])
        if not config.get('fps') is None:
            ffmpeg_output_args = ["-r", str(config.get('fps'))] + ffmpeg_output_args
        if config.get('save_clips', {}).get('enabled', False):
            ffmpeg_output_args = [
                "-f",
                "segment",
                "-segment_time",
                "10",
                "-segment_format",
                "mp4",
                "-reset_timestamps",
                "1",
                "-strftime",
                "1",
                "-c",
                "copy",
                "-an",
                "-map",
                "0",
                f"{os.path.join(CACHE_DIR, name)}-%Y%m%d%H%M%S.mp4"
            ] + ffmpeg_output_args
        ffmpeg_cmd = (['ffmpeg'] +
                ffmpeg_global_args +
                ffmpeg_hwaccel_args +
                ffmpeg_input_args +
                ['-i', ffmpeg_input] +
                ffmpeg_output_args +
                ['pipe:'])
        
        config['ffmpeg_cmd'] = ffmpeg_cmd
        
        if 'width' in config and 'height' in config:
            frame_shape = (config['height'], config['width'], 3)
        else:
            frame_shape = get_frame_shape(ffmpeg_input)
        
        config['frame_shape'] = frame_shape
        config['take_frame'] = config.get('take_frame', 1)

        camera_process_info[name] = {
            'camera_fps': mp.Value('d', 0.0),
            'skipped_fps': mp.Value('d', 0.0),
            'process_fps': mp.Value('d', 0.0),
            'detection_fps': mp.Value('d', 0.0),
            'detection_frame': mp.Value('d', 0.0),
            'read_start': mp.Value('d', 0.0),
            'ffmpeg_pid': mp.Value('i', 0),
            'frame_queue': mp.Queue(maxsize=2)
        }

        # merge global object config into camera object config
        camera_objects_config = config.get('objects', {})
        # get objects to track for camera
        objects_to_track = camera_objects_config.get('track', GLOBAL_OBJECT_CONFIG.get('track', ['person']))
        # get object filters
        object_filters = camera_objects_config.get('filters', GLOBAL_OBJECT_CONFIG.get('filters', {}))
        config['objects'] = {
            'track': objects_to_track,
            'filters': object_filters
        }

        capture_process = mp.Process(target=capture_camera, args=(name, config,
            camera_process_info[name], stop_event))
        capture_process.daemon = True
        camera_process_info[name]['capture_process'] = capture_process

        camera_process = mp.Process(target=track_camera, args=(name, config,
            detection_queue, out_events[name], tracked_objects_queue, camera_process_info[name], stop_event))
        camera_process.daemon = True
        camera_process_info[name]['process'] = camera_process

    # start the camera_processes
    for name, camera_process in camera_process_info.items():
        camera_process['capture_process'].start()
        print(f"Camera capture process started for {name}: {camera_process['capture_process'].pid}")
        camera_process['process'].start()
        print(f"Camera process started for {name}: {camera_process['process'].pid}")

    event_processor = EventProcessor(CONFIG, camera_process_info, CACHE_DIR, CLIPS_DIR, event_queue, stop_event, Event)
    event_processor.start()
    
    object_processor = TrackedObjectProcessor(CONFIG['cameras'], client, MQTT_TOPIC_PREFIX, tracked_objects_queue, event_queue, stop_event)
    object_processor.start()
    
    frigate_watchdog = FrigateWatchdog(camera_process_info, CONFIG['cameras'], detectors, detection_queue, out_events, tracked_objects_queue, stop_event)
    frigate_watchdog.start()

    def receiveSignal(signalNumber, frame):
        print('Received:', signalNumber)
        stop_event.set()
        event_processor.join()
        object_processor.join()
        frigate_watchdog.join()

        for detector in detectors.values():
            detector.stop()
        for shm in camera_shms:
            shm.close()
            shm.unlink()
        sys.exit()
    
    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    @app.route('/')
    def ishealthy():
        # return a health
        return "Frigate is running. Alive and healthy!"

    @app.route('/debug/stack')
    def processor_stack():
        frame = sys._current_frames().get(object_processor.ident, None)
        if frame:
            return "<br>".join(traceback.format_stack(frame)), 200
        else:
            return "no frame found", 200

    @app.route('/debug/print_stack')
    def print_stack():
        pid = int(request.args.get('pid', 0))
        if pid == 0:
            return "missing pid", 200
        else:
            os.kill(pid, signal.SIGUSR1)
            return "check logs", 200
    
    @app.route('/events')
    def events():
        events = Event.select()
        return jsonify([model_to_dict(e) for e in events])

    @app.route('/debug/stats')
    def stats():
        stats = {}

        total_detection_fps = 0

        for name, camera_stats in camera_process_info.items():
            total_detection_fps += camera_stats['detection_fps'].value
            stats[name] = {
                'camera_fps': round(camera_stats['camera_fps'].value, 2),
                'process_fps': round(camera_stats['process_fps'].value, 2),
                'skipped_fps': round(camera_stats['skipped_fps'].value, 2),
                'detection_fps': round(camera_stats['detection_fps'].value, 2),
                'pid': camera_stats['process'].pid,
                'capture_pid': camera_stats['capture_process'].pid,
                'frame_info': {
                    'detect': camera_stats['detection_frame'].value,
                    'process': object_processor.camera_data[name]['current_frame_time']
                }
            }
        
        stats['detectors'] = {}
        for name, detector in detectors.items():
            stats['detectors'][name] = {
                'inference_speed': round(detector.avg_inference_speed.value*1000, 2),
                'detection_start': detector.detection_start.value,
                'pid': detector.detect_process.pid
            }
        stats['detection_fps'] = round(total_detection_fps, 2)

        return jsonify(stats)

    @app.route('/<camera_name>/<label>/best.jpg')
    def best(camera_name, label):
        if camera_name in CONFIG['cameras']:
            best_object = object_processor.get_best(camera_name, label)
            best_frame = best_object.get('frame')
            if best_frame is None:
                best_frame = np.zeros((720,1280,3), np.uint8)
            else:
                best_frame = cv2.cvtColor(best_frame, cv2.COLOR_YUV2BGR_I420)
            
            crop = bool(request.args.get('crop', 0, type=int))
            if crop:
                region = best_object.get('region', [0,0,300,300])
                best_frame = best_frame[region[1]:region[3], region[0]:region[2]]
            
            height = int(request.args.get('h', str(best_frame.shape[0])))
            width = int(height*best_frame.shape[1]/best_frame.shape[0])

            best_frame = cv2.resize(best_frame, dsize=(width, height), interpolation=cv2.INTER_AREA)
            ret, jpg = cv2.imencode('.jpg', best_frame)
            response = make_response(jpg.tobytes())
            response.headers['Content-Type'] = 'image/jpg'
            return response
        else:
            return "Camera named {} not found".format(camera_name), 404

    @app.route('/<camera_name>')
    def mjpeg_feed(camera_name):
        fps = int(request.args.get('fps', '3'))
        height = int(request.args.get('h', '360'))
        if camera_name in CONFIG['cameras']:
            # return a multipart response
            return Response(imagestream(camera_name, fps, height),
                            mimetype='multipart/x-mixed-replace; boundary=frame')
        else:
            return "Camera named {} not found".format(camera_name), 404
    
    @app.route('/<camera_name>/latest.jpg')
    def latest_frame(camera_name):
        if camera_name in CONFIG['cameras']:
            # max out at specified FPS
            frame = object_processor.get_current_frame(camera_name)
            if frame is None:
                frame = np.zeros((720,1280,3), np.uint8)

            height = int(request.args.get('h', str(frame.shape[0])))
            width = int(height*frame.shape[1]/frame.shape[0])

            frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_AREA)

            ret, jpg = cv2.imencode('.jpg', frame)
            response = make_response(jpg.tobytes())
            response.headers['Content-Type'] = 'image/jpg'
            return response
        else:
            return "Camera named {} not found".format(camera_name), 404
            
    def imagestream(camera_name, fps, height):
        while True:
            # max out at specified FPS
            time.sleep(1/fps)
            frame = object_processor.get_current_frame(camera_name, draw=True)
            if frame is None:
                frame = np.zeros((height,int(height*16/9),3), np.uint8)

            width = int(height*frame.shape[1]/frame.shape[0])
            frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_LINEAR)

            ret, jpg = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n\r\n')

    app.run(host='0.0.0.0', port=WEB_PORT, debug=False)

    object_processor.join()

if __name__ == '__main__':
    init_db()
    main()
