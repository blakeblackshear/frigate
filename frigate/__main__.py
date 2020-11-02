import faulthandler; faulthandler.enable()
import os 
import json
import yaml
import multiprocessing as mp

from playhouse.sqlite_ext import SqliteExtDatabase
from typing import Dict, List

from frigate.config import FRIGATE_CONFIG_SCHEMA
from frigate.edgetpu import EdgeTPUProcess
from frigate.events import EventProcessor
from frigate.http import create_app
from frigate.models import Event
from frigate.mqtt import create_mqtt_client
from frigate.object_processing import TrackedObjectProcessor
from frigate.video import get_frame_shape, track_camera, get_ffmpeg_input, capture_camera
from frigate.watchdog import FrigateWatchdog

class FrigateApp():
    def __init__(self):
        self.stop_event = mp.Event()
        self.config: dict = None
        self.detection_queue = mp.Queue()
        self.detectors: Dict[str: EdgeTPUProcess] = {}
        self.detection_out_events: Dict[str: mp.Event] = {}
        self.detection_shms: List[mp.shared_memory.SharedMemory] = []
        self.camera_metrics = {}
    
    def init_config(self):
        # TODO: sub in FRIGATE_ENV vars
        frigate_env_vars = {k: v for k, v in os.environ.items() if k.startswith('FRIGATE_')}
        config_file = os.environ.get('CONFIG_FILE', '/config/config.yml')

        with open(config_file) as f:
            raw_config = f.read()
        
        if config_file.endswith(".yml"):    
            config = yaml.safe_load(raw_config)
        elif config_file.endswith(".json"):
            config = json.loads(raw_config)
        
        self.config = FRIGATE_CONFIG_SCHEMA(config)

        if 'password' in self.config['mqtt']:
            self.config['mqtt']['password'] = self.config['mqtt']['password'].format(**frigate_env_vars)

        cache_dir = self.config['save_clips']['cache_dir']
        clips_dir = self.config['save_clips']['clips_dir']

        if not os.path.exists(cache_dir) and not os.path.islink(cache_dir):
            os.makedirs(cache_dir)
        if not os.path.exists(clips_dir) and not os.path.islink(clips_dir):
            os.makedirs(clips_dir)

        for camera_name, camera_config in self.config['cameras'].items():

            # set shape
            if 'width' in camera_config and 'height' in camera_config:
                frame_shape = (camera_config['height'], camera_config['width'], 3)
            else:
                frame_shape = get_frame_shape(camera_config['ffmpeg']['input'])
        
            camera_config['frame_shape'] = frame_shape

            # build ffmpeg command
            ffmpeg = camera_config['ffmpeg']
            ffmpeg_input = ffmpeg['input'].format(**frigate_env_vars)
            ffmpeg_global_args = ffmpeg.get('global_args', self.config['ffmpeg']['global_args'])
            ffmpeg_hwaccel_args = ffmpeg.get('hwaccel_args', self.config['ffmpeg']['hwaccel_args'])
            ffmpeg_input_args = ffmpeg.get('input_args', self.config['ffmpeg']['input_args'])
            ffmpeg_output_args = ffmpeg.get('output_args', self.config['ffmpeg']['output_args'])
            if not camera_config.get('fps') is None:
                ffmpeg_output_args = ["-r", str(camera_config['fps'])] + ffmpeg_output_args
            if camera_config['save_clips']['enabled']:
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
                    f"{os.path.join(self.config['save_clips']['cache_dir'], camera_name)}-%Y%m%d%H%M%S.mp4"
                ] + ffmpeg_output_args
            ffmpeg_cmd = (['ffmpeg'] +
                    ffmpeg_global_args +
                    ffmpeg_hwaccel_args +
                    ffmpeg_input_args +
                    ['-i', ffmpeg_input] +
                    ffmpeg_output_args +
                    ['pipe:'])
            
            camera_config['ffmpeg_cmd'] = ffmpeg_cmd

            # create camera_metrics
            self.camera_metrics[camera_name] = {
                'camera_fps': mp.Value('d', 0.0),
                'skipped_fps': mp.Value('d', 0.0),
                'process_fps': mp.Value('d', 0.0),
                'detection_fps': mp.Value('d', 0.0),
                'detection_frame': mp.Value('d', 0.0),
                'read_start': mp.Value('d', 0.0),
                'ffmpeg_pid': mp.Value('i', 0),
                'frame_queue': mp.Queue(maxsize=2)
            }

    def init_queues(self):
        # Queue for clip processing
        self.event_queue = mp.Queue()

        # Queue for cameras to push tracked objects to
        self.detected_frames_queue = mp.Queue(maxsize=len(self.config['cameras'].keys())*2)

    def init_database(self):
        self.db = SqliteExtDatabase(f"/{os.path.join(self.config['save_clips']['clips_dir'], 'frigate.db')}")
        models = [Event]
        self.db.bind(models)
        self.db.create_tables(models, safe=True)

    def init_web_server(self):
        self.flask_app = create_app(self.config, self.db, self.camera_metrics, self.detectors, self.detected_frames_processor)

    def init_mqtt(self):
        # TODO: create config class
        mqtt_config = self.config['mqtt']
        self.mqtt_client = create_mqtt_client(
            mqtt_config['host'],
            mqtt_config['port'],
            mqtt_config['topic_prefix'],
            mqtt_config['client_id'],
            mqtt_config.get('user'),
            mqtt_config.get('password')
        )

    def start_detectors(self):
        for name in self.config['cameras'].keys():
            self.detection_out_events[name] = mp.Event()
            shm_in = mp.shared_memory.SharedMemory(name=name, create=True, size=300*300*3)
            shm_out = mp.shared_memory.SharedMemory(name=f"out-{name}", create=True, size=20*6*4)
            self.detection_shms.append(shm_in)
            self.detection_shms.append(shm_out)

        for name, detector in self.config['detectors'].items():
            if detector['type'] == 'cpu':
                self.detectors[name] = EdgeTPUProcess(self.detection_queue, out_events=self.detection_out_events, tf_device='cpu')
            if detector['type'] == 'edgetpu':
                self.detectors[name] = EdgeTPUProcess(self.detection_queue, out_events=self.detection_out_events, tf_device=detector['device'])

    def start_detected_frames_processor(self):
        self.detected_frames_processor = TrackedObjectProcessor(self.config['cameras'], self.mqtt_client, self.config['mqtt']['topic_prefix'], 
            self.detected_frames_queue, self.event_queue, self.stop_event)
        self.detected_frames_processor.start()

    def start_camera_processors(self):
        for name, config in self.config['cameras'].items():
            camera_process = mp.Process(target=track_camera, args=(name, config,
                self.detection_queue, self.detection_out_events[name], self.detected_frames_queue, 
                self.camera_metrics[name]))
            camera_process.daemon = True
            self.camera_metrics[name]['process'] = camera_process
            camera_process.start()
            print(f"Camera processor started for {name}: {camera_process.pid}")

    def start_camera_capture_processes(self):
        for name, config in self.config['cameras'].items():
            capture_process = mp.Process(target=capture_camera, args=(name, config,
                self.camera_metrics[name]))
            capture_process.daemon = True
            self.camera_metrics[name]['capture_process'] = capture_process
            capture_process.start()
            print(f"Capture process started for {name}: {capture_process.pid}")
    
    def start_event_processor(self):
        self.event_processor = EventProcessor(self.config, self.camera_metrics, self.event_queue, self.stop_event)
        self.event_processor.start()

    def start_watchdog(self):
        self.frigate_watchdog = FrigateWatchdog(self.detectors, self.stop_event)
        self.frigate_watchdog.start()

    def start(self):
        self.init_config()
        self.init_queues()
        self.init_database()
        self.init_mqtt()
        self.start_detectors()
        self.start_detected_frames_processor()
        self.start_camera_processors()
        self.start_camera_capture_processes()
        self.init_web_server()
        self.start_event_processor()
        self.start_watchdog()
        self.flask_app.run(host='0.0.0.0', port=self.config['web_port'], debug=False)
        self.stop()
    
    def stop(self):
        print(f"Stopping...")
        self.stop_event.set()

        self.detected_frames_processor.join()
        self.event_processor.join()
        self.frigate_watchdog.join()

        for detector in self.detectors.values():
            detector.stop()

        while len(self.detection_shms) > 0:
            shm = self.detection_shms.pop()
            shm.close()
            shm.unlink()

if __name__ == '__main__':
    frigate_app = FrigateApp()

    frigate_app.start()
