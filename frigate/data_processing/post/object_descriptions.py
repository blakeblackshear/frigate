"""Post processor for object descriptions using GenAI."""

import datetime
import logging
import os
import threading
from pathlib import Path
from typing import TYPE_CHECKING, Any

import cv2
import numpy as np
from peewee import DoesNotExist

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import CameraConfig, FrigateConfig
from frigate.const import CLIPS_DIR, UPDATE_EVENT_DESCRIPTION
from frigate.data_processing.post.semantic_trigger import SemanticTriggerProcessor
from frigate.data_processing.types import PostProcessDataEnum
from frigate.genai import GenAIClient
from frigate.models import Event
from frigate.types import TrackedObjectUpdateTypesEnum
from frigate.util.builtin import EventsPerSecond, InferenceSpeed
from frigate.util.file import get_event_thumbnail_bytes
from frigate.util.image import create_thumbnail, ensure_jpeg_bytes

if TYPE_CHECKING:
    from frigate.embeddings import Embeddings

from ..post.api import PostProcessorApi
from ..types import DataProcessorMetrics

logger = logging.getLogger(__name__)

MAX_THUMBNAILS = 10


class ObjectDescriptionProcessor(PostProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        embeddings: "Embeddings",
        requestor: InterProcessRequestor,
        metrics: DataProcessorMetrics,
        client: GenAIClient,
        semantic_trigger_processor: SemanticTriggerProcessor | None,
    ):
        super().__init__(config, metrics, None)
        self.config = config
        self.embeddings = embeddings
        self.requestor = requestor
        self.metrics = metrics
        self.genai_client = client
        self.semantic_trigger_processor = semantic_trigger_processor
        self.tracked_events: dict[str, list[Any]] = {}
        self.early_request_sent: dict[str, bool] = {}
        self.object_desc_speed = InferenceSpeed(self.metrics.object_desc_speed)
        self.object_desc_dps = EventsPerSecond()
        self.object_desc_dps.start()

    def __handle_frame_update(
        self, camera: str, data: dict, yuv_frame: np.ndarray
    ) -> None:
        """Handle an update to a frame for an object."""
        camera_config = self.config.cameras[camera]

        # no need to save our own thumbnails if genai is not enabled
        # or if the object has become stationary
        if not data["stationary"]:
            if data["id"] not in self.tracked_events:
                self.tracked_events[data["id"]] = []

            data["thumbnail"] = create_thumbnail(yuv_frame, data["box"])

            # Limit the number of thumbnails saved
            if len(self.tracked_events[data["id"]]) >= MAX_THUMBNAILS:
                # Always keep the first thumbnail for the event
                self.tracked_events[data["id"]].pop(1)

            self.tracked_events[data["id"]].append(data)

        # check if we're configured to send an early request after a minimum number of updates received
        if camera_config.objects.genai.send_triggers.after_significant_updates:
            if (
                len(self.tracked_events.get(data["id"], []))
                >= camera_config.objects.genai.send_triggers.after_significant_updates
                and data["id"] not in self.early_request_sent
            ):
                if data["has_clip"] and data["has_snapshot"]:
                    try:
                        event: Event = Event.get(Event.id == data["id"])
                    except DoesNotExist:
                        logger.error(f"Event {data['id']} not found")
                        return

                    if (
                        not camera_config.objects.genai.objects
                        or event.label in camera_config.objects.genai.objects
                    ) and (
                        not camera_config.objects.genai.required_zones
                        or set(data["entered_zones"])
                        & set(camera_config.objects.genai.required_zones)
                    ):
                        logger.debug(f"{camera} sending early request to GenAI")

                        self.early_request_sent[data["id"]] = True
                        threading.Thread(
                            target=self._genai_embed_description,
                            name=f"_genai_embed_description_{event.id}",
                            daemon=True,
                            args=(
                                event,
                                [
                                    data["thumbnail"]
                                    for data in self.tracked_events[data["id"]]
                                ],
                            ),
                        ).start()

    def __handle_frame_finalize(
        self, camera: str, event: Event, thumbnail: bytes
    ) -> None:
        """Handle the finalization of a frame."""
        camera_config = self.config.cameras[camera]

        if (
            camera_config.objects.genai.enabled
            and camera_config.objects.genai.send_triggers.tracked_object_end
            and (
                not camera_config.objects.genai.objects
                or event.label in camera_config.objects.genai.objects
            )
            and (
                not camera_config.objects.genai.required_zones
                or set(event.zones) & set(camera_config.objects.genai.required_zones)
            )
        ):
            self._process_genai_description(event, camera_config, thumbnail)
        else:
            self.cleanup_event(event.id)

    def __regenerate_description(self, event_id: str, source: str, force: bool) -> None:
        """Regenerate the description for an event."""
        try:
            event: Event = Event.get(Event.id == event_id)
        except DoesNotExist:
            logger.error(f"Event {event_id} not found for description regeneration")
            return

        if self.genai_client is None:
            logger.error("GenAI not enabled")
            return

        camera_config = self.config.cameras[event.camera]
        if not camera_config.objects.genai.enabled and not force:
            logger.error(f"GenAI not enabled for camera {event.camera}")
            return

        thumbnail = get_event_thumbnail_bytes(event)

        # ensure we have a jpeg to pass to the model
        thumbnail = ensure_jpeg_bytes(thumbnail)

        logger.debug(
            f"Trying {source} regeneration for {event}, has_snapshot: {event.has_snapshot}"
        )

        if event.has_snapshot and source == "snapshot":
            snapshot_image = self._read_and_crop_snapshot(event)
            if not snapshot_image:
                return

        embed_image = (
            [snapshot_image]
            if event.has_snapshot and source == "snapshot"
            else (
                [data["thumbnail"] for data in self.tracked_events[event_id]]
                if len(self.tracked_events.get(event_id, [])) > 0
                else [thumbnail]
            )
        )

        self._genai_embed_description(event, embed_image)

    def process_data(self, frame_data: dict, data_type: PostProcessDataEnum) -> None:
        """Process a frame update."""
        self.metrics.object_desc_dps.value = self.object_desc_dps.eps()

        if data_type != PostProcessDataEnum.tracked_object:
            return

        state: str | None = frame_data.get("state", None)

        if state is not None:
            logger.debug(f"Processing {state} for {frame_data['camera']}")

        if state == "update":
            self.__handle_frame_update(
                frame_data["camera"], frame_data["data"], frame_data["yuv_frame"]
            )
        elif state == "finalize":
            self.__handle_frame_finalize(
                frame_data["camera"], frame_data["event"], frame_data["thumbnail"]
            )

    def handle_request(self, topic: str, data: dict[str, Any]) -> str | None:
        """Handle a request."""
        if topic == "regenerate_description":
            self.__regenerate_description(
                data["event_id"], data["source"], data["force"]
            )
        return None

    def cleanup_event(self, event_id: str) -> None:
        """Clean up tracked event data to prevent memory leaks.

        This should be called when an event ends, regardless of whether
        genai processing is triggered.
        """
        if event_id in self.tracked_events:
            del self.tracked_events[event_id]
        if event_id in self.early_request_sent:
            del self.early_request_sent[event_id]

    def _read_and_crop_snapshot(self, event: Event) -> bytes | None:
        """Read, decode, and crop the snapshot image."""

        snapshot_file = os.path.join(CLIPS_DIR, f"{event.camera}-{event.id}.jpg")

        if not os.path.isfile(snapshot_file):
            logger.error(
                f"Cannot load snapshot for {event.id}, file not found: {snapshot_file}"
            )
            return None

        try:
            with open(snapshot_file, "rb") as image_file:
                snapshot_image = image_file.read()

                img = cv2.imdecode(
                    np.frombuffer(snapshot_image, dtype=np.int8),
                    cv2.IMREAD_COLOR,
                )

                # Crop snapshot based on region
                # provide full image if region doesn't exist (manual events)
                height, width = img.shape[:2]
                x1_rel, y1_rel, width_rel, height_rel = event.data.get(
                    "region", [0, 0, 1, 1]
                )
                x1, y1 = int(x1_rel * width), int(y1_rel * height)

                cropped_image = img[
                    y1 : y1 + int(height_rel * height),
                    x1 : x1 + int(width_rel * width),
                ]

                _, buffer = cv2.imencode(".jpg", cropped_image)

                return buffer.tobytes()
        except Exception:
            return None

    def _process_genai_description(
        self, event: Event, camera_config: CameraConfig, thumbnail
    ) -> None:
        if event.has_snapshot and camera_config.objects.genai.use_snapshot:
            snapshot_image = self._read_and_crop_snapshot(event)
            if not snapshot_image:
                return

        num_thumbnails = len(self.tracked_events.get(event.id, []))

        # ensure we have a jpeg to pass to the model
        thumbnail = ensure_jpeg_bytes(thumbnail)

        embed_image = (
            [snapshot_image]
            if event.has_snapshot and camera_config.objects.genai.use_snapshot
            else (
                [data["thumbnail"] for data in self.tracked_events[event.id]]
                if num_thumbnails > 0
                else [thumbnail]
            )
        )

        if camera_config.objects.genai.debug_save_thumbnails and num_thumbnails > 0:
            logger.debug(f"Saving {num_thumbnails} thumbnails for event {event.id}")

            Path(os.path.join(CLIPS_DIR, f"genai-requests/{event.id}")).mkdir(
                parents=True, exist_ok=True
            )

            for idx, data in enumerate(self.tracked_events[event.id], 1):
                jpg_bytes: bytes | None = data["thumbnail"]

                if jpg_bytes is None:
                    logger.warning(f"Unable to save thumbnail {idx} for {event.id}.")
                else:
                    with open(
                        os.path.join(
                            CLIPS_DIR,
                            f"genai-requests/{event.id}/{idx}.jpg",
                        ),
                        "wb",
                    ) as j:
                        j.write(jpg_bytes)

        # Generate the description. Call happens in a thread since it is network bound.
        threading.Thread(
            target=self._genai_embed_description,
            name=f"_genai_embed_description_{event.id}",
            daemon=True,
            args=(
                event,
                embed_image,
            ),
        ).start()

        # Clean up tracked events and early request state
        self.cleanup_event(event.id)

    def _genai_embed_description(self, event: Event, thumbnails: list[bytes]) -> None:
        """Embed the description for an event."""
        start = datetime.datetime.now().timestamp()
        camera_config = self.config.cameras[event.camera]
        description = self.genai_client.generate_object_description(
            camera_config, thumbnails, event
        )

        if not description:
            logger.debug("Failed to generate description for %s", event.id)
            return

        # fire and forget description update
        self.requestor.send_data(
            UPDATE_EVENT_DESCRIPTION,
            {
                "type": TrackedObjectUpdateTypesEnum.description,
                "id": event.id,
                "description": description,
                "camera": event.camera,
            },
        )

        # Embed the description
        if self.config.semantic_search.enabled:
            self.embeddings.embed_description(event.id, description)

            # Check semantic trigger for this description
            if self.semantic_trigger_processor is not None:
                self.semantic_trigger_processor.process_data(
                    {"event_id": event.id, "camera": event.camera, "type": "text"},
                    PostProcessDataEnum.tracked_object,
                )

        # Update inference timing metrics
        self.object_desc_speed.update(datetime.datetime.now().timestamp() - start)
        self.object_desc_dps.update()

        logger.debug(
            "Generated description for %s (%d images): %s",
            event.id,
            len(thumbnails),
            description,
        )
