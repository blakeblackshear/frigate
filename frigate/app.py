import json
import logging
import multiprocessing as mp
import os
from logging.handlers import QueueHandler
from typing import Dict, List
import sys
import signal

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
        tmpfs_size = self.config.save_clips.tmpfs_cache_size
        if tmpfs_size:
             logger.info(f"Creating tmpfs of size {tmpfs_size}")
             rc = os.system(f"mount -t tmpfs -o size={tmpfs_size} tmpfs {CACHE_DIR}")
             if rc != 0:
                 logger.error(f"Failed to create tmpfs, error code: {rc}")

        for d in [RECORD_DIR, CLIPS_DIR, CACHE_DIR]:
            if not os.path.exists(d) and not os.path.islink(d):
                logger.info(f"Creating directory: {d}")
                os.makedirs(d)
            else:
                logger.debug(f"Skipping directory: {d}")
    
    def init_logger(self):
        self.log_process = mp.Process(target=log_process, args=(self.log_queue,), name='log_process')
        self.log_process.daemon = True
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
        
    def check_config(self):
        for name, camera in self.config.cameras.items():
            assigned_roles = list(set([r for i in camera.ffmpeg.inputs for r in i.roles]))
            if not camera.save_clips.enabled and 'clips' in assigned_roles:
                logger.warning(f"Camera {name} has clips assigned to an input, but save_clips is not enabled.")
            elif camera.save_clips.enabled and not 'clips' in assigned_roles:
                logger.warning(f"Camera {name} has save_clips enabled, but clips is not assigned to an input.")

            if not camera.record.enabled and 'record' in assigned_roles:
                logger.warning(f"Camera {name} has record assigned to an input, but record is not enabled.")
            elif camera.record.enabled and not 'record' in assigned_roles:
                logger.warning(f"Camera {name} has record enabled, but record is not assigned to an input.")

            if not camera.rtmp.enabled and 'rtmp' in assigned_roles:
                logger.warning(f"Camera {name} has rtmp assigned to an input, but rtmp is not enabled.")
            elif camera.rtmp.enabled and not 'rtmp' in assigned_roles:
                logger.warning(f"Camera {name} has rtmp enabled, but rtmp is not assigned to an input.")
    
    def set_log_levels(self):
        logging.getLogger().setLevel(self.config.logger.default)
        for log, level in self.config.logger.logs.items():
            logging.getLogger(log).setLevel(level)
        
        if not 'werkzeug' in self.config.logger.logs:
            logging.getLogger('werkzeug').setLevel('ERROR')

    def init_queues(self):
        # Queues for clip processing
        self.event_queue = mp.Queue()
        self.event_processed_queue = mp.Queue()

        # Queue for cameras to push tracked objects to
        self.detected_frames_queue = mp.Queue(maxsize=len(self.config.cameras.keys())*2)

    def init_database(self):
        self.db = SqliteExtDatabase(self.config.database.path)
        models = [Event]
        self.db.bind(models)
        self.db.create_tables(models, safe=True)

    def init_web_server(self):
        self.flask_app = create_app(self.config, self.db, self.camera_metrics, self.detectors, self.detected_frames_processor)

    def init_mqtt(self):
        self.mqtt_client = create_mqtt_client(self.config.mqtt)

    def start_detectors(self):
        model_shape = (self.config.model.height, self.config.model.width)
        for name in self.config.cameras.keys():
            self.detection_out_events[name] = mp.Event()
            shm_in = mp.shared_memory.SharedMemory(name=name, create=True, size=self.config.model.height*self.config.model.width*3)
            shm_out = mp.shared_memory.SharedMemory(name=f"out-{name}", create=True, size=20*6*4)
            self.detection_shms.append(shm_in)
            self.detection_shms.append(shm_out)

        for name, detector in self.config.detectors.items():
            if detector.type == 'cpu':
                self.detectors[name] = EdgeTPUProcess(name, self.detection_queue, self.detection_out_events, model_shape, 'cpu', detector.num_threads)
            if detector.type == 'edgetpu':
                self.detectors[name] = EdgeTPUProcess(name, self.detection_queue, self.detection_out_events, model_shape, detector.device, detector.num_threads)

    def start_detected_frames_processor(self):
        self.detected_frames_processor = TrackedObjectProcessor(self.config, self.mqtt_client, self.config.mqtt.topic_prefix, 
            self.detected_frames_queue, self.event_queue, self.event_processed_queue, self.stop_event)
        self.detected_frames_processor.start()

    def start_camera_processors(self):
        model_shape = (self.config.model.height, self.config.model.width)
        for name, config in self.config.cameras.items():
            camera_process = mp.Process(target=track_camera, name=f"camera_processor:{name}", args=(name, config, model_shape,
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
        try:
            try:
                self.init_config()
            except Exception as e:
                logger.error(f"Error parsing config: {e}")
                self.log_process.terminate()
                sys.exit(1)
            self.ensure_dirs()
            self.check_config()
            self.set_log_levels()
            self.init_queues()
            self.init_database()
            self.init_mqtt()
        except Exception as e:
            print(e)
            self.log_process.terminate()
            sys.exit(1)
        self.start_detectors()
        self.start_detected_frames_processor()
        self.start_camera_processors()
        self.start_camera_capture_processes()
        self.init_web_server()
        self.start_event_processor()
        self.start_event_cleanup()
        self.start_recording_maintainer()
        self.start_watchdog()
        # self.zeroconf = broadcast_zeroconf(self.config.mqtt.client_id)

        def receiveSignal(signalNumber, frame):
            self.stop()
            sys.exit()
        
        signal.signal(signal.SIGTERM, receiveSignal)

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
