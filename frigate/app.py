import json
import logging
import multiprocessing as mp
import os
import signal
import sys
import threading
from logging.handlers import QueueHandler
from typing import Dict, List

import yaml
from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase
from pydantic import ValidationError

from frigate.config import DetectorTypeEnum, FrigateConfig
from frigate.const import CACHE_DIR, CLIPS_DIR, RECORD_DIR
from frigate.edgetpu import EdgeTPUProcess
from frigate.events import EventCleanup, EventProcessor
from frigate.http import create_app
from frigate.log import log_process, root_configurer
from frigate.models import Event, Recordings
from frigate.mqtt import MqttSocketRelay, create_mqtt_client
from frigate.object_processing import TrackedObjectProcessor
from frigate.output import output_frames
from frigate.record import RecordingCleanup, RecordingMaintainer
from frigate.stats import StatsEmitter, stats_init
from frigate.version import VERSION
from frigate.video import capture_camera, track_camera
from frigate.watchdog import FrigateWatchdog

logger = logging.getLogger(__name__)


class FrigateApp:
    def __init__(self):
        self.stop_event = mp.Event()
        self.base_config: FrigateConfig = None
        self.config: FrigateConfig = None
        self.detection_queue = mp.Queue()
        self.detectors: Dict[str, EdgeTPUProcess] = {}
        self.detection_out_events: Dict[str, mp.Event] = {}
        self.detection_shms: List[mp.shared_memory.SharedMemory] = []
        self.log_queue = mp.Queue()
        self.camera_metrics = {}

    def set_environment_vars(self):
        for key, value in self.config.environment_vars.items():
            os.environ[key] = value

    def ensure_dirs(self):
        for d in [RECORD_DIR, CLIPS_DIR, CACHE_DIR]:
            if not os.path.exists(d) and not os.path.islink(d):
                logger.info(f"Creating directory: {d}")
                os.makedirs(d)
            else:
                logger.debug(f"Skipping directory: {d}")

    def init_logger(self):
        self.log_process = mp.Process(
            target=log_process, args=(self.log_queue,), name="log_process"
        )
        self.log_process.daemon = True
        self.log_process.start()
        root_configurer(self.log_queue)

    def init_config(self):
        config_file = os.environ.get("CONFIG_FILE", "/config/config.yml")

        # Check if we can use .yaml instead of .yml
        config_file_yaml = config_file.replace(".yml", ".yaml")
        if os.path.isfile(config_file_yaml):
            config_file = config_file_yaml

        user_config = FrigateConfig.parse_file(config_file)
        self.config = user_config.runtime_config

        for camera_name in self.config.cameras.keys():
            # create camera_metrics
            self.camera_metrics[camera_name] = {
                "camera_fps": mp.Value("d", 0.0),
                "skipped_fps": mp.Value("d", 0.0),
                "process_fps": mp.Value("d", 0.0),
                "detection_enabled": mp.Value(
                    "i", self.config.cameras[camera_name].detect.enabled
                ),
                "detection_fps": mp.Value("d", 0.0),
                "detection_frame": mp.Value("d", 0.0),
                "read_start": mp.Value("d", 0.0),
                "ffmpeg_pid": mp.Value("i", 0),
                "frame_queue": mp.Queue(maxsize=2),
            }

    def set_log_levels(self):
        logging.getLogger().setLevel(self.config.logger.default.value.upper())
        for log, level in self.config.logger.logs.items():
            logging.getLogger(log).setLevel(level.value.upper())

        if not "werkzeug" in self.config.logger.logs:
            logging.getLogger("werkzeug").setLevel("ERROR")

    def init_queues(self):
        # Queues for clip processing
        self.event_queue = mp.Queue()
        self.event_processed_queue = mp.Queue()
        self.video_output_queue = mp.Queue(maxsize=len(self.config.cameras.keys()) * 2)

        # Queue for cameras to push tracked objects to
        self.detected_frames_queue = mp.Queue(
            maxsize=len(self.config.cameras.keys()) * 2
        )

        # Queue for recordings info
        self.recordings_info_queue = mp.Queue()

    def init_database(self):
        # Migrate DB location
        old_db_path = os.path.join(CLIPS_DIR, "frigate.db")
        if not os.path.isfile(self.config.database.path) and os.path.isfile(
            old_db_path
        ):
            os.rename(old_db_path, self.config.database.path)

        # Migrate DB schema
        migrate_db = SqliteExtDatabase(self.config.database.path)

        # Run migrations
        del logging.getLogger("peewee_migrate").handlers[:]
        router = Router(migrate_db)
        router.run()

        migrate_db.close()

        self.db = SqliteQueueDatabase(self.config.database.path)
        models = [Event, Recordings]
        self.db.bind(models)

    def init_stats(self):
        self.stats_tracking = stats_init(self.camera_metrics, self.detectors)

    def init_web_server(self):
        self.flask_app = create_app(
            self.config,
            self.db,
            self.stats_tracking,
            self.detected_frames_processor,
        )

    def init_mqtt(self):
        self.mqtt_client = create_mqtt_client(self.config, self.camera_metrics)

    def start_mqtt_relay(self):
        self.mqtt_relay = MqttSocketRelay(
            self.mqtt_client, self.config.mqtt.topic_prefix
        )
        self.mqtt_relay.start()

    def start_detectors(self):
        model_path = self.config.model.path
        model_shape = (self.config.model.height, self.config.model.width)
        for name in self.config.cameras.keys():
            self.detection_out_events[name] = mp.Event()

            try:
                shm_in = mp.shared_memory.SharedMemory(
                    name=name,
                    create=True,
                    size=self.config.model.height * self.config.model.width * 3,
                )
            except FileExistsError:
                shm_in = mp.shared_memory.SharedMemory(name=name)

            try:
                shm_out = mp.shared_memory.SharedMemory(
                    name=f"out-{name}", create=True, size=20 * 6 * 4
                )
            except FileExistsError:
                shm_out = mp.shared_memory.SharedMemory(name=f"out-{name}")

            self.detection_shms.append(shm_in)
            self.detection_shms.append(shm_out)

        for name, detector in self.config.detectors.items():
            if detector.type == DetectorTypeEnum.cpu:
                self.detectors[name] = EdgeTPUProcess(
                    name,
                    self.detection_queue,
                    self.detection_out_events,
                    model_path,
                    model_shape,
                    "cpu",
                    detector.num_threads,
                )
            if detector.type == DetectorTypeEnum.edgetpu:
                self.detectors[name] = EdgeTPUProcess(
                    name,
                    self.detection_queue,
                    self.detection_out_events,
                    model_path,
                    model_shape,
                    detector.device,
                    detector.num_threads,
                )

    def start_detected_frames_processor(self):
        self.detected_frames_processor = TrackedObjectProcessor(
            self.config,
            self.mqtt_client,
            self.config.mqtt.topic_prefix,
            self.detected_frames_queue,
            self.event_queue,
            self.event_processed_queue,
            self.video_output_queue,
            self.recordings_info_queue,
            self.stop_event,
        )
        self.detected_frames_processor.start()

    def start_video_output_processor(self):
        output_processor = mp.Process(
            target=output_frames,
            name=f"output_processor",
            args=(
                self.config,
                self.video_output_queue,
            ),
        )
        output_processor.daemon = True
        self.output_processor = output_processor
        output_processor.start()
        logger.info(f"Output process started: {output_processor.pid}")

    def start_camera_processors(self):
        model_shape = (self.config.model.height, self.config.model.width)
        for name, config in self.config.cameras.items():
            camera_process = mp.Process(
                target=track_camera,
                name=f"camera_processor:{name}",
                args=(
                    name,
                    config,
                    model_shape,
                    self.config.model.merged_labelmap,
                    self.detection_queue,
                    self.detection_out_events[name],
                    self.detected_frames_queue,
                    self.camera_metrics[name],
                ),
            )
            camera_process.daemon = True
            self.camera_metrics[name]["process"] = camera_process
            camera_process.start()
            logger.info(f"Camera processor started for {name}: {camera_process.pid}")

    def start_camera_capture_processes(self):
        for name, config in self.config.cameras.items():
            capture_process = mp.Process(
                target=capture_camera,
                name=f"camera_capture:{name}",
                args=(name, config, self.camera_metrics[name]),
            )
            capture_process.daemon = True
            self.camera_metrics[name]["capture_process"] = capture_process
            capture_process.start()
            logger.info(f"Capture process started for {name}: {capture_process.pid}")

    def start_event_processor(self):
        self.event_processor = EventProcessor(
            self.config,
            self.camera_metrics,
            self.event_queue,
            self.event_processed_queue,
            self.stop_event,
        )
        self.event_processor.start()

    def start_event_cleanup(self):
        self.event_cleanup = EventCleanup(self.config, self.stop_event)
        self.event_cleanup.start()

    def start_recording_maintainer(self):
        self.recording_maintainer = RecordingMaintainer(
            self.config, self.recordings_info_queue, self.stop_event
        )
        self.recording_maintainer.start()

    def start_recording_cleanup(self):
        self.recording_cleanup = RecordingCleanup(self.config, self.stop_event)
        self.recording_cleanup.start()

    def start_stats_emitter(self):
        self.stats_emitter = StatsEmitter(
            self.config,
            self.stats_tracking,
            self.mqtt_client,
            self.config.mqtt.topic_prefix,
            self.stop_event,
        )
        self.stats_emitter.start()

    def start_watchdog(self):
        self.frigate_watchdog = FrigateWatchdog(self.detectors, self.stop_event)
        self.frigate_watchdog.start()

    def start(self):
        self.init_logger()
        logger.info(f"Starting Frigate ({VERSION})")
        try:
            try:
                self.init_config()
            except Exception as e:
                print("*************************************************************")
                print("*************************************************************")
                print("***    Your config file is not valid!                     ***")
                print("***    Please check the docs at                           ***")
                print("***    https://docs.frigate.video/configuration/index     ***")
                print("*************************************************************")
                print("*************************************************************")
                print("***    Config Validation Errors                           ***")
                print("*************************************************************")
                print(e)
                print("*************************************************************")
                print("***    End Config Validation Errors                       ***")
                print("*************************************************************")
                self.log_process.terminate()
                sys.exit(1)
            self.set_environment_vars()
            self.ensure_dirs()
            self.set_log_levels()
            self.init_queues()
            self.init_database()
            self.init_mqtt()
        except Exception as e:
            print(e)
            self.log_process.terminate()
            sys.exit(1)
        self.start_detectors()
        self.start_video_output_processor()
        self.start_detected_frames_processor()
        self.start_camera_processors()
        self.start_camera_capture_processes()
        self.init_stats()
        self.init_web_server()
        self.start_mqtt_relay()
        self.start_event_processor()
        self.start_event_cleanup()
        self.start_recording_maintainer()
        self.start_recording_cleanup()
        self.start_stats_emitter()
        self.start_watchdog()
        # self.zeroconf = broadcast_zeroconf(self.config.mqtt.client_id)

        def receiveSignal(signalNumber, frame):
            self.stop()
            sys.exit()

        signal.signal(signal.SIGTERM, receiveSignal)

        try:
            self.flask_app.run(host="127.0.0.1", port=5001, debug=False)
        except KeyboardInterrupt:
            pass

        self.stop()

    def stop(self):
        logger.info(f"Stopping...")
        self.stop_event.set()

        self.mqtt_relay.stop()
        self.detected_frames_processor.join()
        self.event_processor.join()
        self.event_cleanup.join()
        self.recording_maintainer.join()
        self.recording_cleanup.join()
        self.stats_emitter.join()
        self.frigate_watchdog.join()
        self.db.stop()

        for detector in self.detectors.values():
            detector.stop()

        while len(self.detection_shms) > 0:
            shm = self.detection_shms.pop()
            shm.close()
            shm.unlink()
