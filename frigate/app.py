import datetime
import logging
import multiprocessing as mp
import os
import secrets
import shutil
from multiprocessing import Queue
from multiprocessing.synchronize import Event as MpEvent
from typing import Optional

import psutil
import uvicorn
from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase

import frigate.util as util
from frigate.api.auth import hash_password
from frigate.api.fastapi_app import create_fastapi_app
from frigate.camera import CameraMetrics, PTZMetrics
from frigate.comms.config_updater import ConfigPublisher
from frigate.comms.dispatcher import Communicator, Dispatcher
from frigate.comms.event_metadata_updater import (
    EventMetadataPublisher,
    EventMetadataTypeEnum,
)
from frigate.comms.inter_process import InterProcessCommunicator
from frigate.comms.mqtt import MqttClient
from frigate.comms.webpush import WebPushClient
from frigate.comms.ws import WebSocketClient
from frigate.comms.zmq_proxy import ZmqProxy
from frigate.config.config import FrigateConfig
from frigate.const import (
    CACHE_DIR,
    CLIPS_DIR,
    CONFIG_DIR,
    EXPORT_DIR,
    MODEL_CACHE_DIR,
    RECORD_DIR,
)
from frigate.db.sqlitevecq import SqliteVecQueueDatabase
from frigate.embeddings import EmbeddingsContext, manage_embeddings
from frigate.events.audio import AudioProcessor
from frigate.events.cleanup import EventCleanup
from frigate.events.external import ExternalEventProcessor
from frigate.events.maintainer import EventProcessor
from frigate.models import (
    Event,
    Export,
    Previews,
    Recordings,
    RecordingsToDelete,
    Regions,
    ReviewSegment,
    Timeline,
    User,
)
from frigate.object_detection import ObjectDetectProcess
from frigate.object_processing import TrackedObjectProcessor
from frigate.output.output import output_frames
from frigate.ptz.autotrack import PtzAutoTrackerThread
from frigate.ptz.onvif import OnvifController
from frigate.record.cleanup import RecordingCleanup
from frigate.record.export import migrate_exports
from frigate.record.record import manage_recordings
from frigate.review.review import manage_review_segments
from frigate.stats.emitter import StatsEmitter
from frigate.stats.util import stats_init
from frigate.storage import StorageMaintainer
from frigate.timeline import TimelineProcessor
from frigate.util.builtin import empty_and_close_queue
from frigate.util.object import get_camera_regions_grid
from frigate.version import VERSION
from frigate.video import capture_camera, track_camera
from frigate.watchdog import FrigateWatchdog

logger = logging.getLogger(__name__)


class FrigateApp:
    def __init__(self, config: FrigateConfig) -> None:
        self.audio_process: Optional[mp.Process] = None
        self.stop_event: MpEvent = mp.Event()
        self.detection_queue: Queue = mp.Queue()
        self.detectors: dict[str, ObjectDetectProcess] = {}
        self.detection_out_events: dict[str, MpEvent] = {}
        self.detection_shms: list[mp.shared_memory.SharedMemory] = []
        self.log_queue: Queue = mp.Queue()
        self.camera_metrics: dict[str, CameraMetrics] = {}
        self.ptz_metrics: dict[str, PTZMetrics] = {}
        self.processes: dict[str, int] = {}
        self.embeddings: Optional[EmbeddingsContext] = None
        self.region_grids: dict[str, list[list[dict[str, int]]]] = {}
        self.config = config

    def ensure_dirs(self) -> None:
        for d in [
            CONFIG_DIR,
            RECORD_DIR,
            f"{CLIPS_DIR}/cache",
            CACHE_DIR,
            MODEL_CACHE_DIR,
            EXPORT_DIR,
        ]:
            if not os.path.exists(d) and not os.path.islink(d):
                logger.info(f"Creating directory: {d}")
                os.makedirs(d)
            else:
                logger.debug(f"Skipping directory: {d}")

    def init_camera_metrics(self) -> None:
        # create camera_metrics
        for camera_name in self.config.cameras.keys():
            self.camera_metrics[camera_name] = CameraMetrics()
            self.ptz_metrics[camera_name] = PTZMetrics(
                autotracker_enabled=self.config.cameras[
                    camera_name
                ].onvif.autotracking.enabled
            )

    def init_queues(self) -> None:
        # Queue for cameras to push tracked objects to
        self.detected_frames_queue: Queue = mp.Queue(
            maxsize=sum(camera.enabled for camera in self.config.cameras.values()) * 2
        )

        # Queue for timeline events
        self.timeline_queue: Queue = mp.Queue()

    def init_database(self) -> None:
        def vacuum_db(db: SqliteExtDatabase) -> None:
            logger.info("Running database vacuum")
            db.execute_sql("VACUUM;")

            try:
                with open(f"{CONFIG_DIR}/.vacuum", "w") as f:
                    f.write(str(datetime.datetime.now().timestamp()))
            except PermissionError:
                logger.error("Unable to write to /config to save DB state")

        def cleanup_timeline_db(db: SqliteExtDatabase) -> None:
            db.execute_sql(
                "DELETE FROM timeline WHERE source_id NOT IN (SELECT id FROM event);"
            )

            try:
                with open(f"{CONFIG_DIR}/.timeline", "w") as f:
                    f.write(str(datetime.datetime.now().timestamp()))
            except PermissionError:
                logger.error("Unable to write to /config to save DB state")

        # Migrate DB schema
        migrate_db = SqliteExtDatabase(self.config.database.path)

        # Run migrations
        del logging.getLogger("peewee_migrate").handlers[:]
        router = Router(migrate_db)

        if len(router.diff) > 0:
            logger.info("Making backup of DB before migrations...")
            shutil.copyfile(
                self.config.database.path,
                self.config.database.path.replace("frigate.db", "backup.db"),
            )

        router.run()

        # this is a temporary check to clean up user DB from beta
        # will be removed before final release
        if not os.path.exists(f"{CONFIG_DIR}/.timeline"):
            cleanup_timeline_db(migrate_db)

        # check if vacuum needs to be run
        if os.path.exists(f"{CONFIG_DIR}/.vacuum"):
            with open(f"{CONFIG_DIR}/.vacuum") as f:
                try:
                    timestamp = round(float(f.readline()))
                except Exception:
                    timestamp = 0

                if (
                    timestamp
                    < (
                        datetime.datetime.now() - datetime.timedelta(weeks=2)
                    ).timestamp()
                ):
                    vacuum_db(migrate_db)
        else:
            vacuum_db(migrate_db)

        migrate_db.close()

    def init_go2rtc(self) -> None:
        for proc in psutil.process_iter(["pid", "name"]):
            if proc.info["name"] == "go2rtc":
                logger.info(f"go2rtc process pid: {proc.info['pid']}")
                self.processes["go2rtc"] = proc.info["pid"]

    def init_recording_manager(self) -> None:
        recording_process = util.Process(
            target=manage_recordings,
            name="recording_manager",
            args=(self.config,),
        )
        recording_process.daemon = True
        self.recording_process = recording_process
        recording_process.start()
        self.processes["recording"] = recording_process.pid or 0
        logger.info(f"Recording process started: {recording_process.pid}")

    def init_review_segment_manager(self) -> None:
        review_segment_process = util.Process(
            target=manage_review_segments,
            name="review_segment_manager",
            args=(self.config,),
        )
        review_segment_process.daemon = True
        self.review_segment_process = review_segment_process
        review_segment_process.start()
        self.processes["review_segment"] = review_segment_process.pid or 0
        logger.info(f"Review process started: {review_segment_process.pid}")

    def init_embeddings_manager(self) -> None:
        if not self.config.semantic_search.enabled:
            return

        embedding_process = util.Process(
            target=manage_embeddings,
            name="embeddings_manager",
            args=(self.config,),
        )
        embedding_process.daemon = True
        self.embedding_process = embedding_process
        embedding_process.start()
        self.processes["embeddings"] = embedding_process.pid or 0
        logger.info(f"Embedding process started: {embedding_process.pid}")

    def bind_database(self) -> None:
        """Bind db to the main process."""
        # NOTE: all db accessing processes need to be created before the db can be bound to the main process
        self.db = SqliteVecQueueDatabase(
            self.config.database.path,
            pragmas={
                "auto_vacuum": "FULL",  # Does not defragment database
                "cache_size": -512 * 1000,  # 512MB of cache,
                "synchronous": "NORMAL",  # Safe when using WAL https://www.sqlite.org/pragma.html#pragma_synchronous
            },
            timeout=max(
                60, 10 * len([c for c in self.config.cameras.values() if c.enabled])
            ),
            load_vec_extension=self.config.semantic_search.enabled,
        )
        models = [
            Event,
            Export,
            Previews,
            Recordings,
            RecordingsToDelete,
            Regions,
            ReviewSegment,
            Timeline,
            User,
        ]
        self.db.bind(models)

    def check_db_data_migrations(self) -> None:
        # check if vacuum needs to be run
        if not os.path.exists(f"{CONFIG_DIR}/.exports"):
            try:
                with open(f"{CONFIG_DIR}/.exports", "w") as f:
                    f.write(str(datetime.datetime.now().timestamp()))
            except PermissionError:
                logger.error("Unable to write to /config to save export state")

            migrate_exports(self.config.ffmpeg, list(self.config.cameras.keys()))

    def init_embeddings_client(self) -> None:
        if self.config.semantic_search.enabled:
            # Create a client for other processes to use
            self.embeddings = EmbeddingsContext(self.db)

    def init_external_event_processor(self) -> None:
        self.external_event_processor = ExternalEventProcessor(self.config)

    def init_inter_process_communicator(self) -> None:
        self.inter_process_communicator = InterProcessCommunicator()
        self.inter_config_updater = ConfigPublisher()
        self.event_metadata_updater = EventMetadataPublisher(
            EventMetadataTypeEnum.regenerate_description
        )
        self.inter_zmq_proxy = ZmqProxy()

    def init_onvif(self) -> None:
        self.onvif_controller = OnvifController(self.config, self.ptz_metrics)

    def init_dispatcher(self) -> None:
        comms: list[Communicator] = []

        if self.config.mqtt.enabled:
            comms.append(MqttClient(self.config))

        if self.config.notifications.enabled_in_config:
            comms.append(WebPushClient(self.config))

        comms.append(WebSocketClient(self.config))
        comms.append(self.inter_process_communicator)

        self.dispatcher = Dispatcher(
            self.config,
            self.inter_config_updater,
            self.onvif_controller,
            self.ptz_metrics,
            comms,
        )

    def start_detectors(self) -> None:
        for name in self.config.cameras.keys():
            self.detection_out_events[name] = mp.Event()

            try:
                largest_frame = max(
                    [
                        det.model.height * det.model.width * 3
                        if det.model is not None
                        else 320
                        for det in self.config.detectors.values()
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

    def start_ptz_autotracker(self) -> None:
        self.ptz_autotracker_thread = PtzAutoTrackerThread(
            self.config,
            self.onvif_controller,
            self.ptz_metrics,
            self.dispatcher,
            self.stop_event,
        )
        self.ptz_autotracker_thread.start()

    def start_detected_frames_processor(self) -> None:
        self.detected_frames_processor = TrackedObjectProcessor(
            self.config,
            self.dispatcher,
            self.detected_frames_queue,
            self.ptz_autotracker_thread,
            self.stop_event,
        )
        self.detected_frames_processor.start()

    def start_video_output_processor(self) -> None:
        output_processor = util.Process(
            target=output_frames,
            name="output_processor",
            args=(self.config,),
        )
        output_processor.daemon = True
        self.output_processor = output_processor
        output_processor.start()
        logger.info(f"Output process started: {output_processor.pid}")

    def init_historical_regions(self) -> None:
        # delete region grids for removed or renamed cameras
        cameras = list(self.config.cameras.keys())
        Regions.delete().where(~(Regions.camera << cameras)).execute()

        # create or update region grids for each camera
        for camera in self.config.cameras.values():
            assert camera.name is not None
            self.region_grids[camera.name] = get_camera_regions_grid(
                camera.name,
                camera.detect,
                max(self.config.model.width, self.config.model.height),
            )

    def start_camera_processors(self) -> None:
        for name, config in self.config.cameras.items():
            if not self.config.cameras[name].enabled:
                logger.info(f"Camera processor not started for disabled camera {name}")
                continue

            camera_process = util.Process(
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
                    self.ptz_metrics[name],
                    self.region_grids[name],
                ),
                daemon=True,
            )
            self.camera_metrics[name].process = camera_process
            camera_process.start()
            logger.info(f"Camera processor started for {name}: {camera_process.pid}")

    def start_camera_capture_processes(self) -> None:
        shm_frame_count = self.shm_frame_count()

        for name, config in self.config.cameras.items():
            if not self.config.cameras[name].enabled:
                logger.info(f"Capture process not started for disabled camera {name}")
                continue

            capture_process = util.Process(
                target=capture_camera,
                name=f"camera_capture:{name}",
                args=(name, config, shm_frame_count, self.camera_metrics[name]),
            )
            capture_process.daemon = True
            self.camera_metrics[name].capture_process = capture_process
            capture_process.start()
            logger.info(f"Capture process started for {name}: {capture_process.pid}")

    def start_audio_processor(self) -> None:
        audio_cameras = [
            c
            for c in self.config.cameras.values()
            if c.enabled and c.audio.enabled_in_config
        ]

        if audio_cameras:
            self.audio_process = AudioProcessor(audio_cameras, self.camera_metrics)
            self.audio_process.start()
            self.processes["audio_detector"] = self.audio_process.pid or 0

    def start_timeline_processor(self) -> None:
        self.timeline_processor = TimelineProcessor(
            self.config, self.timeline_queue, self.stop_event
        )
        self.timeline_processor.start()

    def start_event_processor(self) -> None:
        self.event_processor = EventProcessor(
            self.config,
            self.timeline_queue,
            self.stop_event,
        )
        self.event_processor.start()

    def start_event_cleanup(self) -> None:
        self.event_cleanup = EventCleanup(self.config, self.stop_event, self.db)
        self.event_cleanup.start()

    def start_record_cleanup(self) -> None:
        self.record_cleanup = RecordingCleanup(self.config, self.stop_event)
        self.record_cleanup.start()

    def start_storage_maintainer(self) -> None:
        self.storage_maintainer = StorageMaintainer(self.config, self.stop_event)
        self.storage_maintainer.start()

    def start_stats_emitter(self) -> None:
        self.stats_emitter = StatsEmitter(
            self.config,
            stats_init(
                self.config, self.camera_metrics, self.detectors, self.processes
            ),
            self.stop_event,
        )
        self.stats_emitter.start()

    def start_watchdog(self) -> None:
        self.frigate_watchdog = FrigateWatchdog(self.detectors, self.stop_event)
        self.frigate_watchdog.start()

    def shm_frame_count(self) -> int:
        total_shm = round(shutil.disk_usage("/dev/shm").total / pow(2, 20), 1)

        # required for log files + nginx cache
        min_req_shm = 40 + 10

        if self.config.birdseye.restream:
            min_req_shm += 8

        available_shm = total_shm - min_req_shm
        cam_total_frame_size = 0.0

        for camera in self.config.cameras.values():
            if camera.enabled and camera.detect.width and camera.detect.height:
                cam_total_frame_size += round(
                    (camera.detect.width * camera.detect.height * 1.5 + 270480)
                    / 1048576,
                    1,
                )

        shm_frame_count = min(50, int(available_shm / (cam_total_frame_size)))

        logger.debug(
            f"Calculated total camera size {available_shm} / {cam_total_frame_size} :: {shm_frame_count} frames for each camera in SHM"
        )

        if shm_frame_count < 10:
            logger.warning(
                f"The current SHM size of {total_shm}MB is too small, recommend increasing it to at least {round(min_req_shm + cam_total_frame_size * 10)}MB."
            )

        return shm_frame_count

    def init_auth(self) -> None:
        if self.config.auth.enabled:
            if User.select().count() == 0:
                password = secrets.token_hex(16)
                password_hash = hash_password(
                    password, iterations=self.config.auth.hash_iterations
                )
                User.insert(
                    {
                        User.username: "admin",
                        User.password_hash: password_hash,
                        User.notification_tokens: [],
                    }
                ).execute()

                logger.info("********************************************************")
                logger.info("********************************************************")
                logger.info("***    Auth is enabled, but no users exist.          ***")
                logger.info("***    Created a default user:                       ***")
                logger.info("***    User: admin                                   ***")
                logger.info(f"***    Password: {password}   ***")
                logger.info("********************************************************")
                logger.info("********************************************************")
            elif self.config.auth.reset_admin_password:
                password = secrets.token_hex(16)
                password_hash = hash_password(
                    password, iterations=self.config.auth.hash_iterations
                )
                User.replace(
                    username="admin",
                    password_hash=password_hash,
                    notification_tokens=[],
                ).execute()

                logger.info("********************************************************")
                logger.info("********************************************************")
                logger.info("***    Reset admin password set in the config.       ***")
                logger.info(f"***    Password: {password}   ***")
                logger.info("********************************************************")
                logger.info("********************************************************")

    def start(self) -> None:
        logger.info(f"Starting Frigate ({VERSION})")

        # Ensure global state.
        self.ensure_dirs()

        # Start frigate services.
        self.init_camera_metrics()
        self.init_queues()
        self.init_database()
        self.init_onvif()
        self.init_recording_manager()
        self.init_review_segment_manager()
        self.init_go2rtc()
        self.start_detectors()
        self.init_embeddings_manager()
        self.bind_database()
        self.check_db_data_migrations()
        self.init_inter_process_communicator()
        self.init_dispatcher()
        self.init_embeddings_client()
        self.start_video_output_processor()
        self.start_ptz_autotracker()
        self.init_historical_regions()
        self.start_detected_frames_processor()
        self.start_camera_processors()
        self.start_camera_capture_processes()
        self.start_audio_processor()
        self.start_storage_maintainer()
        self.init_external_event_processor()
        self.start_stats_emitter()
        self.start_timeline_processor()
        self.start_event_processor()
        self.start_event_cleanup()
        self.start_record_cleanup()
        self.start_watchdog()

        self.init_auth()

        try:
            uvicorn.run(
                create_fastapi_app(
                    self.config,
                    self.db,
                    self.embeddings,
                    self.detected_frames_processor,
                    self.storage_maintainer,
                    self.onvif_controller,
                    self.external_event_processor,
                    self.stats_emitter,
                    self.event_metadata_updater,
                ),
                host="127.0.0.1",
                port=5001,
                log_level="error",
            )
        finally:
            self.stop()

    def stop(self) -> None:
        logger.info("Stopping...")

        self.stop_event.set()

        # set an end_time on entries without an end_time before exiting
        Event.update(
            end_time=datetime.datetime.now().timestamp(), has_snapshot=False
        ).where(Event.end_time == None).execute()
        ReviewSegment.update(end_time=datetime.datetime.now().timestamp()).where(
            ReviewSegment.end_time == None
        ).execute()

        # stop the audio process
        if self.audio_process:
            self.audio_process.terminate()
            self.audio_process.join()

        # ensure the capture processes are done
        for camera, metrics in self.camera_metrics.items():
            capture_process = metrics.capture_process
            if capture_process is not None:
                logger.info(f"Waiting for capture process for {camera} to stop")
                capture_process.terminate()
                capture_process.join()

        # ensure the camera processors are done
        for camera, metrics in self.camera_metrics.items():
            camera_process = metrics.process
            if camera_process is not None:
                logger.info(f"Waiting for process for {camera} to stop")
                camera_process.terminate()
                camera_process.join()
                logger.info(f"Closing frame queue for {camera}")
                empty_and_close_queue(metrics.frame_queue)

        # ensure the detectors are done
        for detector in self.detectors.values():
            detector.stop()

        empty_and_close_queue(self.detection_queue)
        logger.info("Detection queue closed")

        self.detected_frames_processor.join()
        empty_and_close_queue(self.detected_frames_queue)
        logger.info("Detected frames queue closed")

        self.timeline_processor.join()
        self.event_processor.join()
        empty_and_close_queue(self.timeline_queue)
        logger.info("Timeline queue closed")

        self.output_processor.terminate()
        self.output_processor.join()

        self.recording_process.terminate()
        self.recording_process.join()

        self.review_segment_process.terminate()
        self.review_segment_process.join()

        self.external_event_processor.stop()
        self.dispatcher.stop()
        self.ptz_autotracker_thread.join()

        self.event_cleanup.join()
        self.record_cleanup.join()
        self.stats_emitter.join()
        self.frigate_watchdog.join()
        self.db.stop()

        # Save embeddings stats to disk
        if self.embeddings:
            self.embeddings.stop()

        # Stop Communicators
        self.inter_process_communicator.stop()
        self.inter_config_updater.stop()
        self.event_metadata_updater.stop()
        self.inter_zmq_proxy.stop()

        while len(self.detection_shms) > 0:
            shm = self.detection_shms.pop()
            shm.close()
            shm.unlink()

        os._exit(os.EX_OK)
