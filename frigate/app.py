import json
import logging
import multiprocessing as mp
import os
from logging.handlers import QueueHandler
from typing import Dict, List
import sys

import yaml
from playhouse.sqlite_ext import SqliteExtDatabase

from frigate.config import FrigateConfig
from frigate.const import RECORD_DIR, CLIPS_DIR, CACHE_DIR
from frigate.edgetpu import EdgeTPUProcess
from frigate.events import EventProcessor, EventCleanup
from frigate.http import create_app
from frigate.log import log_process, root_configurer
from frigate.models import Event
from frigate.mqtt import create_mqtt_client
from frigate.object_processing import TrackedObjectProcessor
from frigate.record import RecordingMaintainer
from frigate.video import capture_camera, track_camera
from frigate.watchdog import FrigateWatchdog
from frigate.zeroconf import broadcast_zeroconf

logger = logging.getLogger(__name__)

class FrigateApp():
    def __init__(self):
        self.stop_event = mp.Event()
        self.config: FrigateConfig = None
        self.detection_queue = mp.Queue()
        self.detectors: Dict[str, EdgeTPUProcess] = {}
        self.detection_out_events: Dict[str, mp.Event] = {}
        self.detection_shms: List[mp.shared_memory.SharedMemory] = []
        self.log_queue = mp.Queue()
        self.camera_metrics = {}

    def ensure_dirs(self):
        for d in [RECORD_DIR, CLIPS_DIR, CACHE_DIR]:
            if not os.path.exists(d) and not os.path.islink(d):
                logger.info(f"Creating directory: {d}")
                os.makedirs(d)
            else:
                logger.debug(f"Skipping directory: {d}")
    
    def init_logger(self):
        self.log_process = mp.Process(target=log_process, args=(self.log_queue,), name='log_process')
        self.log_process.start()
        root_configurer(self.log_queue)
    
    def init_config(self):
        config_file = os.environ.get('CONFIG_FILE', '/config/config.yml')
        self.config = FrigateConfig(config_file=config_file)

        for camera_name in self.config.cameras.keys():
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
        # Queues for clip processing
        self.event_queue = mp.Queue()
        self.event_processed_queue = mp.Queue()

        # Queue for cameras to push tracked objects to
        self.detected_frames_queue = mp.Queue(maxsize=len(self.config.cameras.keys())*2)

    def init_database(self):
        self.db = SqliteExtDatabase(f"/{os.path.join(CLIPS_DIR, 'frigate.db')}")
        models = [Event]
        self.db.bind(models)
        self.db.create_tables(models, safe=True)

    def init_web_server(self):
        self.flask_app = create_app(self.config, self.db, self.camera_metrics, self.detectors, self.detected_frames_processor)

    def init_mqtt(self):
        self.mqtt_client = create_mqtt_client(self.config.mqtt)

    def start_detectors(self):
        for name in self.config.cameras.keys():
            self.detection_out_events[name] = mp.Event()
            shm_in = mp.shared_memory.SharedMemory(name=name, create=True, size=300*300*3)
            shm_out = mp.shared_memory.SharedMemory(name=f"out-{name}", create=True, size=20*6*4)
            self.detection_shms.append(shm_in)
            self.detection_shms.append(shm_out)

        for name, detector in self.config.detectors.items():
            if detector.type == 'cpu':
                self.detectors[name] = EdgeTPUProcess(name, self.detection_queue, out_events=self.detection_out_events, tf_device='cpu')
            if detector.type == 'edgetpu':
                self.detectors[name] = EdgeTPUProcess(name, self.detection_queue, out_events=self.detection_out_events, tf_device=detector.device)

    def start_detected_frames_processor(self):
        self.detected_frames_processor = TrackedObjectProcessor(self.config, self.mqtt_client, self.config.mqtt.topic_prefix, 
            self.detected_frames_queue, self.event_queue, self.event_processed_queue, self.stop_event)
        self.detected_frames_processor.start()

    def start_camera_processors(self):
        for name, config in self.config.cameras.items():
            camera_process = mp.Process(target=track_camera, name=f"camera_processor:{name}", args=(name, config,
                self.detection_queue, self.detection_out_events[name], self.detected_frames_queue, 
                self.camera_metrics[name]))
            camera_process.daemon = True
            self.camera_metrics[name]['process'] = camera_process
            camera_process.start()
            logger.info(f"Camera processor started for {name}: {camera_process.pid}")

    def start_camera_capture_processes(self):
        for name, config in self.config.cameras.items():
            capture_process = mp.Process(target=capture_camera, name=f"camera_capture:{name}", args=(name, config,
                self.camera_metrics[name]))
            capture_process.daemon = True
            self.camera_metrics[name]['capture_process'] = capture_process
            capture_process.start()
            logger.info(f"Capture process started for {name}: {capture_process.pid}")
    
    def start_event_processor(self):
        self.event_processor = EventProcessor(self.config, self.camera_metrics, self.event_queue, self.event_processed_queue, self.stop_event)
        self.event_processor.start()
    
    def start_event_cleanup(self):
        self.event_cleanup = EventCleanup(self.config, self.stop_event)
        self.event_cleanup.start()
    
    def start_recording_maintainer(self):
        self.recording_maintainer = RecordingMaintainer(self.config, self.stop_event)
        self.recording_maintainer.start()

    def start_watchdog(self):
        self.frigate_watchdog = FrigateWatchdog(self.detectors, self.stop_event)
        self.frigate_watchdog.start()

    def start(self):
        self.init_logger()
        self.ensure_dirs()
        try:
            self.init_config()
        except Exception as e:
            logger.error(f"Error parsing config: {e}")
            self.log_process.terminate()
            sys.exit(1)
        self.init_queues()
        self.init_database()
        self.init_mqtt()
        self.start_detectors()
        self.start_detected_frames_processor()
        self.start_camera_processors()
        self.start_camera_capture_processes()
        self.init_web_server()
        self.start_event_processor()
        self.start_event_cleanup()
        self.start_recording_maintainer()
        self.start_watchdog()
        self.zeroconf = broadcast_zeroconf(self.config.mqtt.client_id)
        self.flask_app.run(host='127.0.0.1', port=5001, debug=False)
        self.stop()
    
    def stop(self):
        logger.info(f"Stopping...")
        self.stop_event.set()

        self.detected_frames_processor.join()
        self.event_processor.join()
        self.event_cleanup.join()
        self.recording_maintainer.join()
        self.frigate_watchdog.join()

        for detector in self.detectors.values():
            detector.stop()

        while len(self.detection_shms) > 0:
            shm = self.detection_shms.pop()
            shm.close()
            shm.unlink()
