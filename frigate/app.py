import logging
import multiprocessing as mp
from multiprocessing.queues import Queue
from multiprocessing.synchronize import Event as MpEvent
import os
import shutil
import signal
import sys
from typing import Optional
from types import FrameType

import traceback
from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.comms.dispatcher import Communicator, Dispatcher
from frigate.comms.mqtt import MqttClient
from frigate.comms.ws import WebSocketClient
from frigate.config import FrigateConfig
from frigate.const import CACHE_DIR, CLIPS_DIR, CONFIG_DIR, DEFAULT_DB_PATH, RECORD_DIR
from frigate.object_detection import ObjectDetectProcess
from frigate.events import EventCleanup, EventProcessor
from frigate.http import create_app
from frigate.log import log_process, root_configurer
from frigate.models import Event, Recordings, Timeline
from frigate.object_processing import TrackedObjectProcessor
from frigate.output import output_frames
from frigate.plus import PlusApi
from frigate.record import RecordingCleanup, RecordingMaintainer
from frigate.stats import StatsEmitter, stats_init
from frigate.storage import StorageMaintainer
from frigate.timeline import TimelineProcessor
from frigate.version import VERSION
from frigate.video import capture_camera, track_camera
from frigate.watchdog import FrigateWatchdog
from frigate.types import CameraMetricsTypes

logger = logging.getLogger(__name__)


class FrigateApp:
    def __init__(self) -> None:
        self.stop_event: MpEvent = mp.Event()
        self.detection_queue: Queue = mp.Queue()
        self.detectors: dict[str, ObjectDetectProcess] = {}
        self.detection_out_events: dict[str, MpEvent] = {}
        self.detection_shms: list[mp.shared_memory.SharedMemory] = []
        self.log_queue: Queue = mp.Queue()
        self.plus_api = PlusApi()
        self.camera_metrics: dict[str, CameraMetricsTypes] = {}

    def set_environment_vars(self) -> None:
        for key, value in self.config.environment_vars.items():
            os.environ[key] = value

    def ensure_dirs(self) -> None:
        for d in [CONFIG_DIR, RECORD_DIR, CLIPS_DIR, CACHE_DIR]:
            if not os.path.exists(d) and not os.path.islink(d):
                logger.info(f"Creating directory: {d}")
                os.makedirs(d)
            else:
                logger.debug(f"Skipping directory: {d}")

    def init_logger(self) -> None:
        self.log_process = mp.Process(
            target=log_process, args=(self.log_queue,), name="log_process"
        )
        self.log_process.daemon = True
        self.log_process.start()
        root_configurer(self.log_queue)

    def init_config(self) -> None:
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
                "motion_enabled": mp.Value("i", True),
                "improve_contrast_enabled": mp.Value(
                    "i", self.config.cameras[camera_name].motion.improve_contrast
                ),
                "motion_threshold": mp.Value(
                    "i", self.config.cameras[camera_name].motion.threshold
                ),
                "motion_contour_area": mp.Value(
                    "i", self.config.cameras[camera_name].motion.contour_area
                ),
                "detection_fps": mp.Value("d", 0.0),
                "detection_frame": mp.Value("d", 0.0),
                "read_start": mp.Value("d", 0.0),
                "ffmpeg_pid": mp.Value("i", 0),
                "frame_queue": mp.Queue(maxsize=2),
                "capture_process": None,
                "process": None,
            }

    def set_log_levels(self) -> None:
        logging.getLogger().setLevel(self.config.logger.default.value.upper())
        for log, level in self.config.logger.logs.items():
            logging.getLogger(log).setLevel(level.value.upper())

        if not "werkzeug" in self.config.logger.logs:
            logging.getLogger("werkzeug").setLevel("ERROR")

        if not "ws4py" in self.config.logger.logs:
            logging.getLogger("ws4py").setLevel("ERROR")

    def init_queues(self) -> None:
        # Queues for clip processing
        self.event_queue: Queue = mp.Queue()
        self.event_processed_queue: Queue = mp.Queue()
        self.video_output_queue: Queue = mp.Queue(
            maxsize=len(self.config.cameras.keys()) * 2
        )

        # Queue for cameras to push tracked objects to
        self.detected_frames_queue: Queue = mp.Queue(
            maxsize=len(self.config.cameras.keys()) * 2
        )

        # Queue for recordings info
        self.recordings_info_queue: Queue = mp.Queue()

        # Queue for timeline events
        self.timeline_queue: Queue = mp.Queue()

    def init_database(self) -> None:
        # Migrate DB location
        old_db_path = DEFAULT_DB_PATH
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
        models = [Event, Recordings, Timeline]
        self.db.bind(models)

    def init_stats(self) -> None:
        self.stats_tracking = stats_init(
            self.config, self.camera_metrics, self.detectors
        )

    def init_web_server(self) -> None:
        self.flask_app = create_app(
            self.config,
            self.db,
            self.stats_tracking,
            self.detected_frames_processor,
            self.storage_maintainer,
            self.plus_api,
        )

    def init_dispatcher(self) -> None:
        comms: list[Communicator] = []

        if self.config.mqtt.enabled:
            comms.append(MqttClient(self.config))

        comms.append(WebSocketClient(self.config))
        self.dispatcher = Dispatcher(self.config, self.camera_metrics, comms)

    def start_detectors(self) -> None:
        for name in self.config.cameras.keys():
            self.detection_out_events[name] = mp.Event()

            try:
                largest_frame = max(
                    [
                        det.model.height * det.model.width * 3
                        for (name, det) in self.config.detectors.items()
                    ]
                )
                shm_in = mp.shared_memory.SharedMemory(
                    name=name,
                    create=True,
                    size=largest_frame,
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

        for name, detector_config in self.config.detectors.items():
            self.detectors[name] = ObjectDetectProcess(
                name,
                self.detection_queue,
                self.detection_out_events,
                detector_config,
            )

    def start_detected_frames_processor(self) -> None:
        self.detected_frames_processor = TrackedObjectProcessor(
            self.config,
            self.dispatcher,
            self.detected_frames_queue,
            self.event_queue,
            self.event_processed_queue,
            self.video_output_queue,
            self.recordings_info_queue,
            self.stop_event,
        )
        self.detected_frames_processor.start()

    def start_video_output_processor(self) -> None:
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

    def start_camera_processors(self) -> None:
        for name, config in self.config.cameras.items():
            if not self.config.cameras[name].enabled:
                logger.info(f"Camera processor not started for disabled camera {name}")
                continue

            camera_process = mp.Process(
                target=track_camera,
                name=f"camera_processor:{name}",
                args=(
                    name,
                    config,
                    self.config.model,
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

    def start_camera_capture_processes(self) -> None:
        for name, config in self.config.cameras.items():
            if not self.config.cameras[name].enabled:
                logger.info(f"Capture process not started for disabled camera {name}")
                continue

            capture_process = mp.Process(
                target=capture_camera,
                name=f"camera_capture:{name}",
                args=(name, config, self.camera_metrics[name]),
            )
            capture_process.daemon = True
            self.camera_metrics[name]["capture_process"] = capture_process
            capture_process.start()
            logger.info(f"Capture process started for {name}: {capture_process.pid}")

    def start_timeline_processor(self) -> None:
        self.timeline_processor = TimelineProcessor(
            self.config, self.timeline_queue, self.stop_event
        )
        self.timeline_processor.start()

    def start_event_processor(self) -> None:
        self.event_processor = EventProcessor(
            self.config,
            self.camera_metrics,
            self.event_queue,
            self.event_processed_queue,
            self.timeline_queue,
            self.stop_event,
        )
        self.event_processor.start()

    def start_event_cleanup(self) -> None:
        self.event_cleanup = EventCleanup(self.config, self.stop_event)
        self.event_cleanup.start()

    def start_recording_maintainer(self) -> None:
        self.recording_maintainer = RecordingMaintainer(
            self.config, self.recordings_info_queue, self.stop_event
        )
        self.recording_maintainer.start()

    def start_recording_cleanup(self) -> None:
        self.recording_cleanup = RecordingCleanup(self.config, self.stop_event)
        self.recording_cleanup.start()

    def start_storage_maintainer(self) -> None:
        self.storage_maintainer = StorageMaintainer(self.config, self.stop_event)
        self.storage_maintainer.start()

    def start_stats_emitter(self) -> None:
        self.stats_emitter = StatsEmitter(
            self.config,
            self.stats_tracking,
            self.dispatcher,
            self.stop_event,
        )
        self.stats_emitter.start()

    def start_watchdog(self) -> None:
        self.frigate_watchdog = FrigateWatchdog(self.detectors, self.stop_event)
        self.frigate_watchdog.start()

    def check_shm(self) -> None:
        available_shm = round(shutil.disk_usage("/dev/shm").total / 1000000, 1)
        min_req_shm = 30

        for _, camera in self.config.cameras.items():
            min_req_shm += round(
                (camera.detect.width * camera.detect.height * 1.5 * 9 + 270480)
                / 1048576,
                1,
            )

        if available_shm < min_req_shm:
            logger.warning(
                f"The current SHM size of {available_shm}MB is too small, recommend increasing it to at least {min_req_shm}MB."
            )

    def start(self) -> None:
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
                print(traceback.format_exc())
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
            self.init_dispatcher()
        except Exception as e:
            print(e)
            self.log_process.terminate()
            sys.exit(1)
        self.start_detectors()
        self.start_video_output_processor()
        self.start_detected_frames_processor()
        self.start_camera_processors()
        self.start_camera_capture_processes()
        self.start_storage_maintainer()
        self.init_stats()
        self.init_web_server()
        self.start_timeline_processor()
        self.start_event_processor()
        self.start_event_cleanup()
        self.start_recording_maintainer()
        self.start_recording_cleanup()
        self.start_stats_emitter()
        self.start_watchdog()
        self.check_shm()

        def receiveSignal(signalNumber: int, frame: Optional[FrameType]) -> None:
            self.stop()
            sys.exit()

        signal.signal(signal.SIGTERM, receiveSignal)

        try:
            self.flask_app.run(host="127.0.0.1", port=5001, debug=False)
        except KeyboardInterrupt:
            pass

        self.stop()

    def stop(self) -> None:
        logger.info(f"Stopping...")
        self.stop_event.set()

        for detector in self.detectors.values():
            detector.stop()

        # Empty the detection queue and set the events for all requests
        while not self.detection_queue.empty():
            connection_id = self.detection_queue.get(timeout=1)
            self.detection_out_events[connection_id].set()
        self.detection_queue.close()
        self.detection_queue.join_thread()

        self.dispatcher.stop()
        self.detected_frames_processor.join()
        self.event_processor.join()
        self.event_cleanup.join()
        self.recording_maintainer.join()
        self.recording_cleanup.join()
        self.stats_emitter.join()
        self.frigate_watchdog.join()
        self.db.stop()

        while len(self.detection_shms) > 0:
            shm = self.detection_shms.pop()
            shm.close()
            shm.unlink()

        for queue in [
            self.event_queue,
            self.event_processed_queue,
            self.video_output_queue,
            self.detected_frames_queue,
            self.recordings_info_queue,
            self.log_queue,
        ]:
            while not queue.empty():
                queue.get_nowait()
            queue.close()
            queue.join_thread()
