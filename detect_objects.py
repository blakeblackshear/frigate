import os
import sys
import traceback
import signal
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
from flask import Flask, Response, make_response, jsonify, request
import paho.mqtt.client as mqtt

from frigate.video import track_camera, get_ffmpeg_input, get_frame_shape, CameraCapture, start_or_restart_ffmpeg
from frigate.object_processing import TrackedObjectProcessor
from frigate.events import EventProcessor
from frigate.util import EventsPerSecond
from frigate.edgetpu import EdgeTPUProcess

FRIGATE_VARS = {k: v for k, v in os.environ.items() if k.startswith('FRIGATE_')}

with open('/config/config.yml') as f:
    CONFIG = yaml.safe_load(f)

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
         '-pix_fmt', 'rgb24'])
}

GLOBAL_OBJECT_CONFIG = CONFIG.get('objects', {})

WEB_PORT = CONFIG.get('web_port', 5000)
DEBUG = (CONFIG.get('debug', '0') == '1')

def start_plasma_store():
    plasma_cmd = ['plasma_store', '-m', '400000000', '-s', '/tmp/plasma']
    plasma_process = sp.Popen(plasma_cmd, stdout=sp.DEVNULL, stderr=sp.DEVNULL)
    time.sleep(1)
    rc = plasma_process.poll()
    if rc is not None:
        return None
    return plasma_process

class CameraWatchdog(threading.Thread):
    def __init__(self, camera_processes, config, tflite_process, tracked_objects_queue, plasma_process):
        threading.Thread.__init__(self)
        self.camera_processes = camera_processes
        self.config = config
        self.tflite_process = tflite_process
        self.tracked_objects_queue = tracked_objects_queue
        self.plasma_process = plasma_process

    def run(self):
        time.sleep(10)
        while True:
            # wait a bit before checking
            time.sleep(10)

            now = datetime.datetime.now().timestamp()
            
            # check the plasma process
            rc = self.plasma_process.poll()
            if rc != None:
                print(f"plasma_process exited unexpectedly with {rc}")
                self.plasma_process = start_plasma_store()

            # check the detection process
            detection_start = self.tflite_process.detection_start.value
            if (detection_start > 0.0 and 
                now - detection_start > 10):
                print("Detection appears to be stuck. Restarting detection process")
                self.tflite_process.start_or_restart()
            elif not self.tflite_process.detect_process.is_alive():
                print("Detection appears to have stopped. Restarting detection process")
                self.tflite_process.start_or_restart()

            # check the camera processes
            for name, camera_process in self.camera_processes.items():
                process = camera_process['process']
                if not process.is_alive():
                    print(f"Track process for {name} is not alive. Starting again...")
                    camera_process['process_fps'].value = 0.0
                    camera_process['detection_fps'].value = 0.0
                    camera_process['read_start'].value = 0.0
                    process = mp.Process(target=track_camera, args=(name, self.config[name], GLOBAL_OBJECT_CONFIG, camera_process['frame_queue'],
                        camera_process['frame_shape'], self.tflite_process.detection_queue, self.tracked_objects_queue, 
                        camera_process['process_fps'], camera_process['detection_fps'],
                        camera_process['read_start'], camera_process['detection_frame']))
                    process.daemon = True
                    camera_process['process'] = process
                    process.start()
                    print(f"Track process started for {name}: {process.pid}")
                
                if not camera_process['capture_thread'].is_alive():
                    frame_shape = camera_process['frame_shape']
                    frame_size = frame_shape[0] * frame_shape[1] * frame_shape[2]
                    ffmpeg_process = start_or_restart_ffmpeg(camera_process['ffmpeg_cmd'], frame_size)
                    camera_capture = CameraCapture(name, ffmpeg_process, frame_shape, camera_process['frame_queue'], 
                        camera_process['take_frame'], camera_process['camera_fps'], camera_process['detection_frame'])
                    camera_capture.start()
                    camera_process['ffmpeg_process'] = ffmpeg_process
                    camera_process['capture_thread'] = camera_capture
                elif now - camera_process['capture_thread'].current_frame > 5:
                    print(f"No frames received from {name} in 5 seconds. Exiting ffmpeg...")
                    ffmpeg_process = camera_process['ffmpeg_process']
                    ffmpeg_process.terminate()
                    try:
                        print("Waiting for ffmpeg to exit gracefully...")
                        ffmpeg_process.communicate(timeout=30)
                    except sp.TimeoutExpired:
                        print("FFmpeg didnt exit. Force killing...")
                        ffmpeg_process.kill()
                        ffmpeg_process.communicate()

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

    plasma_process = start_plasma_store()

    ##
    # Setup config defaults for cameras
    ##
    for name, config in CONFIG['cameras'].items():
        config['snapshots'] = {
            'show_timestamp': config.get('snapshots', {}).get('show_timestamp', True)
        }

    # Queue for cameras to push tracked objects to
    tracked_objects_queue = mp.SimpleQueue()

    # Queue for clip processing
    event_queue = mp.Queue()
    
    # Start the shared tflite process
    tflite_process = EdgeTPUProcess()

    # start the camera processes
    camera_processes = {}
    for name, config in CONFIG['cameras'].items():
        # Merge the ffmpeg config with the global config
        ffmpeg = config.get('ffmpeg', {})
        ffmpeg_input = get_ffmpeg_input(ffmpeg['input'])
        ffmpeg_global_args = ffmpeg.get('global_args', FFMPEG_DEFAULT_CONFIG['global_args'])
        ffmpeg_hwaccel_args = ffmpeg.get('hwaccel_args', FFMPEG_DEFAULT_CONFIG['hwaccel_args'])
        ffmpeg_input_args = ffmpeg.get('input_args', FFMPEG_DEFAULT_CONFIG['input_args'])
        ffmpeg_output_args = ffmpeg.get('output_args', FFMPEG_DEFAULT_CONFIG['output_args'])
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
                f"/cache/{name}-%Y%m%d%H%M%S.mp4"
            ] + ffmpeg_output_args
        ffmpeg_cmd = (['ffmpeg'] +
                ffmpeg_global_args +
                ffmpeg_hwaccel_args +
                ffmpeg_input_args +
                ['-i', ffmpeg_input] +
                ffmpeg_output_args +
                ['pipe:'])
        
        if 'width' in config and 'height' in config:
            frame_shape = (config['height'], config['width'], 3)
        else:
            frame_shape = get_frame_shape(ffmpeg_input)

        frame_size = frame_shape[0] * frame_shape[1] * frame_shape[2]
        take_frame = config.get('take_frame', 1)

        detection_frame = mp.Value('d', 0.0)

        ffmpeg_process = start_or_restart_ffmpeg(ffmpeg_cmd, frame_size)
        frame_queue = mp.SimpleQueue()
        camera_fps = EventsPerSecond()
        camera_fps.start()
        camera_capture = CameraCapture(name, ffmpeg_process, frame_shape, frame_queue, take_frame, camera_fps, detection_frame)
        camera_capture.start()

        camera_processes[name] = {
            'camera_fps': camera_fps,
            'take_frame': take_frame,
            'process_fps': mp.Value('d', 0.0),
            'detection_fps': mp.Value('d', 0.0),
            'detection_frame': detection_frame,
            'read_start': mp.Value('d', 0.0),
            'ffmpeg_process': ffmpeg_process,
            'ffmpeg_cmd': ffmpeg_cmd,
            'frame_queue': frame_queue,
            'frame_shape': frame_shape,
            'capture_thread': camera_capture
        }

        camera_process = mp.Process(target=track_camera, args=(name, config, GLOBAL_OBJECT_CONFIG, frame_queue, frame_shape,
            tflite_process.detection_queue, tracked_objects_queue, camera_processes[name]['process_fps'], 
            camera_processes[name]['detection_fps'], 
            camera_processes[name]['read_start'], camera_processes[name]['detection_frame']))
        camera_process.daemon = True
        camera_processes[name]['process'] = camera_process

    for name, camera_process in camera_processes.items():
        camera_process['process'].start()
        print(f"Camera_process started for {name}: {camera_process['process'].pid}")

    event_processor = EventProcessor(CONFIG['cameras'], camera_processes, '/cache', '/clips', event_queue)
    event_processor.start()

    object_processor = TrackedObjectProcessor(CONFIG['cameras'], client, MQTT_TOPIC_PREFIX, tracked_objects_queue, event_queue)
    object_processor.start()
    
    camera_watchdog = CameraWatchdog(camera_processes, CONFIG['cameras'], tflite_process, tracked_objects_queue, plasma_process)
    camera_watchdog.start()

    # create a flask app that encodes frames a mjpeg on demand
    app = Flask(__name__)
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)

    @app.route('/')
    def ishealthy():
        # return a healh
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

    @app.route('/debug/stats')
    def stats():
        stats = {}

        total_detection_fps = 0

        for name, camera_stats in camera_processes.items():
            total_detection_fps += camera_stats['detection_fps'].value
            capture_thread = camera_stats['capture_thread']
            stats[name] = {
                'camera_fps': round(capture_thread.fps.eps(), 2),
                'process_fps': round(camera_stats['process_fps'].value, 2),
                'skipped_fps': round(capture_thread.skipped_fps.eps(), 2),
                'detection_fps': round(camera_stats['detection_fps'].value, 2),
                'read_start': camera_stats['read_start'].value,
                'pid': camera_stats['process'].pid,
                'ffmpeg_pid': camera_stats['ffmpeg_process'].pid,
                'frame_info': {
                    'read': capture_thread.current_frame,
                    'detect': camera_stats['detection_frame'].value,
                    'process': object_processor.camera_data[name]['current_frame_time']
                }
            }
        
        stats['coral'] = {
            'fps': round(total_detection_fps, 2),
            'inference_speed': round(tflite_process.avg_inference_speed.value*1000, 2),
            'detection_start': tflite_process.detection_start.value,
            'pid': tflite_process.detect_process.pid
        }

        rc = camera_watchdog.plasma_process.poll()
        stats['plasma_store_rc'] = rc

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
        fps = int(request.args.get('fps', '3'))
        height = int(request.args.get('h', '360'))
        if camera_name in CONFIG['cameras']:
            # return a multipart response
            return Response(imagestream(camera_name, fps, height),
                            mimetype='multipart/x-mixed-replace; boundary=frame')
        else:
            return "Camera named {} not found".format(camera_name), 404

    def imagestream(camera_name, fps, height):
        while True:
            # max out at specified FPS
            time.sleep(1/fps)
            frame = object_processor.get_current_frame(camera_name)
            if frame is None:
                frame = np.zeros((height,int(height*16/9),3), np.uint8)

            width = int(height*frame.shape[1]/frame.shape[0])

            frame = cv2.resize(frame, dsize=(width, height), interpolation=cv2.INTER_LINEAR)
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

            ret, jpg = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' + jpg.tobytes() + b'\r\n\r\n')

    app.run(host='0.0.0.0', port=WEB_PORT, debug=False)

    object_processor.join()
    
    plasma_process.terminate()

if __name__ == '__main__':
    main()
