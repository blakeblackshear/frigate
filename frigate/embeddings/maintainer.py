"""Maintain embeddings in SQLite-vec."""

import base64
import datetime
import logging
import threading
from multiprocessing.synchronize import Event as MpEvent
from typing import Any

from peewee import DoesNotExist

from frigate.comms.config_updater import ConfigSubscriber
from frigate.comms.detections_updater import DetectionSubscriber, DetectionTypeEnum
from frigate.comms.embeddings_updater import (
    EmbeddingsRequestEnum,
    EmbeddingsResponder,
)
from frigate.comms.event_metadata_updater import (
    EventMetadataPublisher,
    EventMetadataSubscriber,
    EventMetadataTypeEnum,
)
from frigate.comms.events_updater import EventEndSubscriber, EventUpdateSubscriber
from frigate.comms.inter_process import InterProcessRequestor
from frigate.comms.recordings_updater import (
    RecordingsDataSubscriber,
    RecordingsDataTypeEnum,
)
from frigate.comms.review_updater import ReviewDataSubscriber
from frigate.config import FrigateConfig
from frigate.config.camera.camera import CameraTypeEnum
from frigate.config.camera.updater import (
    CameraConfigUpdateEnum,
    CameraConfigUpdateSubscriber,
)
from frigate.data_processing.common.license_plate.model import (
    LicensePlateModelRunner,
)
from frigate.data_processing.post.api import PostProcessorApi
from frigate.data_processing.post.audio_transcription import (
    AudioTranscriptionPostProcessor,
)
from frigate.data_processing.post.license_plate import (
    LicensePlatePostProcessor,
)
from frigate.data_processing.post.object_descriptions import ObjectDescriptionProcessor
from frigate.data_processing.post.review_descriptions import ReviewDescriptionProcessor
from frigate.data_processing.post.semantic_trigger import SemanticTriggerProcessor
from frigate.data_processing.real_time.api import RealTimeProcessorApi
from frigate.data_processing.real_time.bird import BirdRealTimeProcessor
from frigate.data_processing.real_time.custom_classification import (
    CustomObjectClassificationProcessor,
    CustomStateClassificationProcessor,
)
from frigate.data_processing.real_time.face import FaceRealTimeProcessor
from frigate.data_processing.real_time.license_plate import (
    LicensePlateRealTimeProcessor,
)
from frigate.data_processing.types import DataProcessorMetrics, PostProcessDataEnum
from frigate.db.sqlitevecq import SqliteVecQueueDatabase
from frigate.events.types import EventTypeEnum, RegenerateDescriptionEnum
from frigate.genai import get_genai_client
from frigate.models import Event, Recordings, ReviewSegment, Trigger
from frigate.util.builtin import serialize
from frigate.util.file import get_event_thumbnail_bytes
from frigate.util.image import SharedMemoryFrameManager

from .embeddings import Embeddings

logger = logging.getLogger(__name__)

MAX_THUMBNAILS = 10


class EmbeddingMaintainer(threading.Thread):
    """Handle embedding queue and post event updates."""

    def __init__(
        self,
        config: FrigateConfig,
        metrics: DataProcessorMetrics | None,
        stop_event: MpEvent,
    ) -> None:
        super().__init__(name="embeddings_maintainer")
        self.config = config
        self.metrics = metrics
        self.embeddings = None
        self.config_updater = CameraConfigUpdateSubscriber(
            self.config,
            self.config.cameras,
            [
                CameraConfigUpdateEnum.add,
                CameraConfigUpdateEnum.remove,
                CameraConfigUpdateEnum.object_genai,
                CameraConfigUpdateEnum.review_genai,
                CameraConfigUpdateEnum.semantic_search,
            ],
        )
        self.classification_config_subscriber = ConfigSubscriber(
            "config/classification/custom/"
        )

        # Configure Frigate DB
        db = SqliteVecQueueDatabase(
            config.database.path,
            pragmas={
                "auto_vacuum": "FULL",  # Does not defragment database
                "cache_size": -512 * 1000,  # 512MB of cache
                "synchronous": "NORMAL",  # Safe when using WAL https://www.sqlite.org/pragma.html#pragma_synchronous
            },
            timeout=max(
                60, 10 * len([c for c in config.cameras.values() if c.enabled])
            ),
            load_vec_extension=True,
        )
        models = [Event, Recordings, ReviewSegment, Trigger]
        db.bind(models)

        if config.semantic_search.enabled:
            self.embeddings = Embeddings(config, db, metrics)

            # Check if we need to re-index events
            if config.semantic_search.reindex:
                self.embeddings.reindex()

            # Sync semantic search triggers in db with config
            self.embeddings.sync_triggers()

        # create communication for updating event descriptions
        self.requestor = InterProcessRequestor()

        self.event_subscriber = EventUpdateSubscriber()
        self.event_end_subscriber = EventEndSubscriber()
        self.event_metadata_publisher = EventMetadataPublisher()
        self.event_metadata_subscriber = EventMetadataSubscriber(
            EventMetadataTypeEnum.regenerate_description
        )
        self.recordings_subscriber = RecordingsDataSubscriber(
            RecordingsDataTypeEnum.saved
        )
        self.review_subscriber = ReviewDataSubscriber("")
        self.detection_subscriber = DetectionSubscriber(DetectionTypeEnum.video.value)
        self.embeddings_responder = EmbeddingsResponder()
        self.frame_manager = SharedMemoryFrameManager()

        self.detected_license_plates: dict[str, dict[str, Any]] = {}
        self.genai_client = get_genai_client(config)

        # Pre-import TensorFlow/tflite on main thread to avoid atexit registration issues
        # when importing from worker threads later (e.g., during dynamic config updates)
        if (
            self.config.classification.bird.enabled
            or len(self.config.classification.custom) > 0
        ):
            try:
                from tflite_runtime.interpreter import Interpreter  # noqa: F401
            except ModuleNotFoundError:
                try:
                    from tensorflow.lite.python.interpreter import (  # noqa: F401
                        Interpreter,
                    )

                    logger.debug(
                        "Pre-imported TensorFlow Interpreter on main thread for classification models"
                    )
                except Exception as e:
                    logger.warning(
                        f"Failed to pre-import TensorFlow Interpreter: {e}. "
                        "Classification models may fail to load if added dynamically."
                    )

        # model runners to share between realtime and post processors
        if self.config.lpr.enabled:
            lpr_model_runner = LicensePlateModelRunner(
                self.requestor,
                device=self.config.lpr.device,
                model_size=self.config.lpr.model_size,
            )

        # realtime processors
        self.realtime_processors: list[RealTimeProcessorApi] = []

        if self.config.face_recognition.enabled:
            logger.debug("Face recognition enabled, initializing FaceRealTimeProcessor")
            self.realtime_processors.append(
                FaceRealTimeProcessor(
                    self.config, self.requestor, self.event_metadata_publisher, metrics
                )
            )
            logger.debug("FaceRealTimeProcessor initialized successfully")

        if self.config.classification.bird.enabled:
            self.realtime_processors.append(
                BirdRealTimeProcessor(
                    self.config, self.event_metadata_publisher, metrics
                )
            )

        if self.config.lpr.enabled:
            self.realtime_processors.append(
                LicensePlateRealTimeProcessor(
                    self.config,
                    self.requestor,
                    self.event_metadata_publisher,
                    metrics,
                    lpr_model_runner,
                    self.detected_license_plates,
                )
            )

        for model_config in self.config.classification.custom.values():
            self.realtime_processors.append(
                CustomStateClassificationProcessor(
                    self.config, model_config, self.requestor, self.metrics
                )
                if model_config.state_config != None
                else CustomObjectClassificationProcessor(
                    self.config,
                    model_config,
                    self.event_metadata_publisher,
                    self.requestor,
                    self.metrics,
                )
            )

        # post processors
        self.post_processors: list[PostProcessorApi] = []

        if any(c.review.genai.enabled_in_config for c in self.config.cameras.values()):
            self.post_processors.append(
                ReviewDescriptionProcessor(
                    self.config, self.requestor, self.metrics, self.genai_client
                )
            )

        if self.config.lpr.enabled:
            self.post_processors.append(
                LicensePlatePostProcessor(
                    self.config,
                    self.requestor,
                    self.event_metadata_publisher,
                    metrics,
                    lpr_model_runner,
                    self.detected_license_plates,
                )
            )

        if self.config.audio_transcription.enabled and any(
            c.enabled_in_config and c.audio_transcription.enabled
            for c in self.config.cameras.values()
        ):
            self.post_processors.append(
                AudioTranscriptionPostProcessor(
                    self.config, self.requestor, self.embeddings, metrics
                )
            )

        semantic_trigger_processor: SemanticTriggerProcessor | None = None
        if self.config.semantic_search.enabled:
            semantic_trigger_processor = SemanticTriggerProcessor(
                db,
                self.config,
                self.requestor,
                self.event_metadata_publisher,
                metrics,
                self.embeddings,
            )
            self.post_processors.append(semantic_trigger_processor)

        if any(c.objects.genai.enabled_in_config for c in self.config.cameras.values()):
            self.post_processors.append(
                ObjectDescriptionProcessor(
                    self.config,
                    self.embeddings,
                    self.requestor,
                    self.metrics,
                    self.genai_client,
                    semantic_trigger_processor,
                )
            )

        self.stop_event = stop_event

        # recordings data
        self.recordings_available_through: dict[str, float] = {}

    def run(self) -> None:
        """Maintain a SQLite-vec database for semantic search."""
        while not self.stop_event.is_set():
            self.config_updater.check_for_updates()
            self._check_classification_config_updates()
            self._process_requests()
            self._process_updates()
            self._process_recordings_updates()
            self._process_review_updates()
            self._process_frame_updates()
            self._expire_dedicated_lpr()
            self._process_finalized()
            self._process_event_metadata()

        self.config_updater.stop()
        self.classification_config_subscriber.stop()
        self.event_subscriber.stop()
        self.event_end_subscriber.stop()
        self.recordings_subscriber.stop()
        self.detection_subscriber.stop()
        self.event_metadata_publisher.stop()
        self.event_metadata_subscriber.stop()
        self.embeddings_responder.stop()
        self.requestor.stop()
        logger.info("Exiting embeddings maintenance...")

    def _check_classification_config_updates(self) -> None:
        """Check for classification config updates and add/remove processors."""
        topic, model_config = self.classification_config_subscriber.check_for_update()

        if topic:
            model_name = topic.split("/")[-1]

            if model_config is None:
                self.realtime_processors = [
                    processor
                    for processor in self.realtime_processors
                    if not (
                        isinstance(
                            processor,
                            (
                                CustomStateClassificationProcessor,
                                CustomObjectClassificationProcessor,
                            ),
                        )
                        and processor.model_config.name == model_name
                    )
                ]

                logger.info(
                    f"Successfully removed classification processor for model: {model_name}"
                )
            else:
                self.config.classification.custom[model_name] = model_config

                # Check if processor already exists
                for processor in self.realtime_processors:
                    if isinstance(
                        processor,
                        (
                            CustomStateClassificationProcessor,
                            CustomObjectClassificationProcessor,
                        ),
                    ):
                        if processor.model_config.name == model_name:
                            logger.debug(
                                f"Classification processor for model {model_name} already exists, skipping"
                            )
                            return

                if model_config.state_config is not None:
                    processor = CustomStateClassificationProcessor(
                        self.config, model_config, self.requestor, self.metrics
                    )
                else:
                    processor = CustomObjectClassificationProcessor(
                        self.config,
                        model_config,
                        self.event_metadata_publisher,
                        self.requestor,
                        self.metrics,
                    )

                self.realtime_processors.append(processor)
                logger.info(
                    f"Added classification processor for model: {model_name} (type: {type(processor).__name__})"
                )

    def _process_requests(self) -> None:
        """Process embeddings requests"""

        def _handle_request(topic: str, data: dict[str, Any]) -> str:
            try:
                # First handle the embedding-specific topics when semantic search is enabled
                if self.config.semantic_search.enabled:
                    if topic == EmbeddingsRequestEnum.embed_description.value:
                        return serialize(
                            self.embeddings.embed_description(
                                data["id"], data["description"]
                            ),
                            pack=False,
                        )
                    elif topic == EmbeddingsRequestEnum.embed_thumbnail.value:
                        thumbnail = base64.b64decode(data["thumbnail"])
                        return serialize(
                            self.embeddings.embed_thumbnail(data["id"], thumbnail),
                            pack=False,
                        )
                    elif topic == EmbeddingsRequestEnum.generate_search.value:
                        return serialize(
                            self.embeddings.embed_description("", data, upsert=False),
                            pack=False,
                        )
                    elif topic == EmbeddingsRequestEnum.reindex.value:
                        response = self.embeddings.start_reindex()
                        return "started" if response else "in_progress"

                processors = [self.realtime_processors, self.post_processors]
                for processor_list in processors:
                    for processor in processor_list:
                        resp = processor.handle_request(topic, data)
                        if resp is not None:
                            return resp

                logger.error(f"No processor handled the topic {topic}")
                return None
            except Exception as e:
                logger.error(f"Unable to handle embeddings request {e}", exc_info=True)

        self.embeddings_responder.check_for_request(_handle_request)

    def _process_updates(self) -> None:
        """Process event updates"""
        update = self.event_subscriber.check_for_update()

        if update is None:
            return

        source_type, _, camera, frame_name, data = update

        logger.debug(
            f"Received update - source_type: {source_type}, camera: {camera}, data label: {data.get('label') if data else 'None'}"
        )

        if not camera or source_type != EventTypeEnum.tracked_object:
            logger.debug(
                f"Skipping update - camera: {camera}, source_type: {source_type}"
            )
            return

        if self.config.semantic_search.enabled:
            self.embeddings.update_stats()

        camera_config = self.config.cameras[camera]

        # no need to process updated objects if no processors are active
        if len(self.realtime_processors) == 0 and len(self.post_processors) == 0:
            logger.debug(
                f"No processors active - realtime: {len(self.realtime_processors)}, post: {len(self.post_processors)}"
            )
            return

        # Create our own thumbnail based on the bounding box and the frame time
        try:
            yuv_frame = self.frame_manager.get(
                frame_name, camera_config.frame_shape_yuv
            )
        except FileNotFoundError:
            logger.debug(f"Frame {frame_name} not found for camera {camera}")
            pass

        if yuv_frame is None:
            logger.debug(
                "Unable to process object update because frame is unavailable."
            )
            return

        logger.debug(
            f"Processing {len(self.realtime_processors)} realtime processors for object {data.get('id')} (label: {data.get('label')})"
        )
        for processor in self.realtime_processors:
            logger.debug(f"Calling process_frame on {processor.__class__.__name__}")
            processor.process_frame(data, yuv_frame)

        for processor in self.post_processors:
            if isinstance(processor, ObjectDescriptionProcessor):
                processor.process_data(
                    {
                        "camera": camera,
                        "data": data,
                        "state": "update",
                        "yuv_frame": yuv_frame,
                    },
                    PostProcessDataEnum.tracked_object,
                )

        self.frame_manager.close(frame_name)

    def _process_finalized(self) -> None:
        """Process the end of an event."""
        while True:
            ended = self.event_end_subscriber.check_for_update()

            if ended == None:
                break

            event_id, camera, updated_db = ended

            # expire in realtime processors
            for processor in self.realtime_processors:
                processor.expire_object(event_id, camera)

            thumbnail: bytes | None = None

            if updated_db:
                try:
                    event: Event = Event.get(Event.id == event_id)
                except DoesNotExist:
                    continue

                # Skip the event if not an object
                if event.data.get("type") != "object":
                    continue

                # Extract valid thumbnail
                thumbnail = get_event_thumbnail_bytes(event)

                # Embed the thumbnail
                self._embed_thumbnail(event_id, thumbnail)

            # call any defined post processors
            for processor in self.post_processors:
                if isinstance(processor, LicensePlatePostProcessor):
                    recordings_available = self.recordings_available_through.get(camera)
                    if (
                        recordings_available is not None
                        and event_id in self.detected_license_plates
                        and self.config.cameras[camera].type != "lpr"
                    ):
                        processor.process_data(
                            {
                                "event_id": event_id,
                                "camera": camera,
                                "recordings_available": self.recordings_available_through[
                                    camera
                                ],
                                "obj_data": self.detected_license_plates[event_id][
                                    "obj_data"
                                ],
                            },
                            PostProcessDataEnum.recording,
                        )
                elif isinstance(processor, AudioTranscriptionPostProcessor):
                    continue
                elif isinstance(processor, SemanticTriggerProcessor):
                    processor.process_data(
                        {"event_id": event_id, "camera": camera, "type": "image"},
                        PostProcessDataEnum.tracked_object,
                    )
                elif isinstance(processor, ObjectDescriptionProcessor):
                    if not updated_db:
                        continue

                    processor.process_data(
                        {
                            "event": event,
                            "camera": camera,
                            "state": "finalize",
                            "thumbnail": thumbnail,
                        },
                        PostProcessDataEnum.tracked_object,
                    )
                else:
                    processor.process_data(
                        {"event_id": event_id, "camera": camera},
                        PostProcessDataEnum.tracked_object,
                    )

    def _expire_dedicated_lpr(self) -> None:
        """Remove plates not seen for longer than expiration timeout for dedicated lpr cameras."""
        now = datetime.datetime.now().timestamp()

        to_remove = []

        for id, data in self.detected_license_plates.items():
            last_seen = data.get("last_seen", 0)
            if not last_seen:
                continue

            if now - last_seen > self.config.cameras[data["camera"]].lpr.expire_time:
                to_remove.append(id)
        for id in to_remove:
            self.event_metadata_publisher.publish(
                (id, now),
                EventMetadataTypeEnum.manual_event_end.value,
            )
            self.detected_license_plates.pop(id)

    def _process_recordings_updates(self) -> None:
        """Process recordings updates."""
        while True:
            update = self.recordings_subscriber.check_for_update()

            if not update:
                break

            (raw_topic, payload) = update

            if not raw_topic or not payload:
                break

            topic = str(raw_topic)

            if topic.endswith(RecordingsDataTypeEnum.saved.value):
                camera, recordings_available_through_timestamp, _ = payload

                self.recordings_available_through[camera] = (
                    recordings_available_through_timestamp
                )

                logger.debug(
                    f"{camera} now has recordings available through {recordings_available_through_timestamp}"
                )

    def _process_review_updates(self) -> None:
        """Process review updates."""
        while True:
            review_updates = self.review_subscriber.check_for_update()

            if review_updates == None:
                break

            for processor in self.post_processors:
                if isinstance(processor, ReviewDescriptionProcessor):
                    processor.process_data(review_updates, PostProcessDataEnum.review)

    def _process_event_metadata(self):
        # Check for regenerate description requests
        (topic, payload) = self.event_metadata_subscriber.check_for_update()

        if topic is None:
            return

        event_id, source, force = payload

        if event_id:
            for processor in self.post_processors:
                if isinstance(processor, ObjectDescriptionProcessor):
                    processor.handle_request(
                        "regenerate_description",
                        {
                            "event_id": event_id,
                            "source": RegenerateDescriptionEnum(source),
                            "force": force,
                        },
                    )

    def _process_frame_updates(self) -> None:
        """Process event updates"""
        (topic, data) = self.detection_subscriber.check_for_update()

        if topic is None:
            return

        camera, frame_name, _, _, motion_boxes, _ = data

        if not camera or len(motion_boxes) == 0:
            return

        camera_config = self.config.cameras[camera]
        dedicated_lpr_enabled = (
            camera_config.type == CameraTypeEnum.lpr
            and "license_plate" not in camera_config.objects.track
        )

        if not dedicated_lpr_enabled and len(self.config.classification.custom) == 0:
            # no active features that use this data
            return

        try:
            yuv_frame = self.frame_manager.get(
                frame_name, camera_config.frame_shape_yuv
            )
        except FileNotFoundError:
            pass

        if yuv_frame is None:
            logger.debug(
                "Unable to process dedicated LPR update because frame is unavailable."
            )
            return

        for processor in self.realtime_processors:
            if dedicated_lpr_enabled and isinstance(
                processor, LicensePlateRealTimeProcessor
            ):
                processor.process_frame(camera, yuv_frame, True)

            if isinstance(processor, CustomStateClassificationProcessor):
                processor.process_frame(
                    {"camera": camera, "motion": motion_boxes}, yuv_frame
                )

        self.frame_manager.close(frame_name)

    def _embed_thumbnail(self, event_id: str, thumbnail: bytes) -> None:
        """Embed the thumbnail for an event."""
        if not self.config.semantic_search.enabled:
            return

        self.embeddings.embed_thumbnail(event_id, thumbnail)
