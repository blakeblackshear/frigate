"""Post time processor to trigger actions based on similar embeddings."""

import datetime
import json
import logging
import os
from typing import Any

import cv2
import numpy as np
from peewee import DoesNotExist

from frigate.comms.event_metadata_updater import (
    EventMetadataPublisher,
    EventMetadataTypeEnum,
)
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.const import CONFIG_DIR
from frigate.data_processing.types import PostProcessDataEnum
from frigate.db.sqlitevecq import SqliteVecQueueDatabase
from frigate.embeddings.util import ZScoreNormalization
from frigate.models import Event, Trigger
from frigate.util.builtin import cosine_distance
from frigate.util.file import get_event_thumbnail_bytes

from ..post.api import PostProcessorApi
from ..types import DataProcessorMetrics

logger = logging.getLogger(__name__)

WRITE_DEBUG_IMAGES = False


class SemanticTriggerProcessor(PostProcessorApi):
    def __init__(
        self,
        db: SqliteVecQueueDatabase,
        config: FrigateConfig,
        requestor: InterProcessRequestor,
        sub_label_publisher: EventMetadataPublisher,
        metrics: DataProcessorMetrics,
        embeddings,
    ):
        super().__init__(config, metrics, None)
        self.db = db
        self.embeddings = embeddings
        self.requestor = requestor
        self.sub_label_publisher = sub_label_publisher
        self.trigger_embeddings: list[np.ndarray] = []

        self.thumb_stats = ZScoreNormalization()
        self.desc_stats = ZScoreNormalization()

        # load stats from disk
        try:
            with open(os.path.join(CONFIG_DIR, ".search_stats.json"), "r") as f:
                data = json.loads(f.read())
                self.thumb_stats.from_dict(data["thumb_stats"])
                self.desc_stats.from_dict(data["desc_stats"])
        except FileNotFoundError:
            pass

    def process_data(
        self, data: dict[str, Any], data_type: PostProcessDataEnum
    ) -> None:
        event_id = data["event_id"]
        camera = data["camera"]
        process_type = data["type"]

        if self.config.cameras[camera].semantic_search.triggers is None:
            return

        triggers = (
            Trigger.select(
                Trigger.camera,
                Trigger.name,
                Trigger.data,
                Trigger.type,
                Trigger.embedding,
                Trigger.threshold,
            )
            .where(Trigger.camera == camera)
            .dicts()
            .iterator()
        )

        for trigger in triggers:
            if (
                trigger["name"]
                not in self.config.cameras[camera].semantic_search.triggers
                or not self.config.cameras[camera]
                .semantic_search.triggers[trigger["name"]]
                .enabled
            ):
                logger.debug(
                    f"Trigger {trigger['name']} is disabled for camera {camera}"
                )
                continue

            logger.debug(
                f"Processing {trigger['type']} trigger for {event_id} on {trigger['camera']}: {trigger['name']}"
            )

            trigger_embedding = np.frombuffer(trigger["embedding"], dtype=np.float32)

            # Get embeddings based on type
            thumbnail_embedding = None
            description_embedding = None

            if process_type == "image":
                cursor = self.db.execute_sql(
                    """
                    SELECT thumbnail_embedding FROM vec_thumbnails WHERE id = ?
                    """,
                    [event_id],
                )
                row = cursor.fetchone() if cursor else None
                if row:
                    thumbnail_embedding = np.frombuffer(row[0], dtype=np.float32)

            if process_type == "text":
                cursor = self.db.execute_sql(
                    """
                    SELECT description_embedding FROM vec_descriptions WHERE id = ?
                    """,
                    [event_id],
                )
                row = cursor.fetchone() if cursor else None
                if row:
                    description_embedding = np.frombuffer(row[0], dtype=np.float32)

            # Skip processing if we don't have any embeddings
            if thumbnail_embedding is None and description_embedding is None:
                logger.debug(f"No embeddings found for {event_id}")
                return

            # Determine which embedding to compare based on trigger type
            if (
                trigger["type"] in ["text", "thumbnail"]
                and thumbnail_embedding is not None
            ):
                data_embedding = thumbnail_embedding
                normalized_distance = self.thumb_stats.normalize(
                    [cosine_distance(data_embedding, trigger_embedding)],
                    save_stats=False,
                )[0]
            elif trigger["type"] == "description" and description_embedding is not None:
                data_embedding = description_embedding
                normalized_distance = self.desc_stats.normalize(
                    [cosine_distance(data_embedding, trigger_embedding)],
                    save_stats=False,
                )[0]

            else:
                continue

            similarity = 1 - normalized_distance

            logger.debug(
                f"Trigger {trigger['name']} ({trigger['data'] if trigger['type'] == 'text' or trigger['type'] == 'description' else 'image'}): "
                f"normalized distance: {normalized_distance:.4f}, "
                f"similarity: {similarity:.4f}, threshold: {trigger['threshold']}"
            )

            # Check if similarity meets threshold
            if similarity >= trigger["threshold"]:
                logger.debug(
                    f"Trigger {trigger['name']} activated with similarity {similarity:.4f}"
                )

                # Update the trigger's last_triggered and triggering_event_id
                Trigger.update(
                    last_triggered=datetime.datetime.now(), triggering_event_id=event_id
                ).where(
                    Trigger.camera == camera, Trigger.name == trigger["name"]
                ).execute()

                # Always publish MQTT message
                self.requestor.send_data(
                    "triggers",
                    json.dumps(
                        {
                            "name": trigger["name"],
                            "camera": camera,
                            "event_id": event_id,
                            "type": trigger["type"],
                            "score": similarity,
                        }
                    ),
                )

                friendly_name = (
                    self.config.cameras[camera]
                    .semantic_search.triggers[trigger["name"]]
                    .friendly_name
                )

                if (
                    self.config.cameras[camera]
                    .semantic_search.triggers[trigger["name"]]
                    .actions
                ):
                    # handle actions for the trigger
                    # notifications already handled by webpush
                    if (
                        "sub_label"
                        in self.config.cameras[camera]
                        .semantic_search.triggers[trigger["name"]]
                        .actions
                    ):
                        self.sub_label_publisher.publish(
                            (event_id, friendly_name, similarity),
                            EventMetadataTypeEnum.sub_label,
                        )
                    if (
                        "attribute"
                        in self.config.cameras[camera]
                        .semantic_search.triggers[trigger["name"]]
                        .actions
                    ):
                        self.sub_label_publisher.publish(
                            (
                                event_id,
                                trigger["name"],
                                trigger["type"],
                                similarity,
                            ),
                            EventMetadataTypeEnum.attribute.value,
                        )

            if WRITE_DEBUG_IMAGES:
                try:
                    event: Event = Event.get(Event.id == event_id)
                except DoesNotExist:
                    return

                # Skip the event if not an object
                if event.data.get("type") != "object":
                    return

                thumbnail_bytes = get_event_thumbnail_bytes(event)

                nparr = np.frombuffer(thumbnail_bytes, np.uint8)
                thumbnail = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                font_scale = 0.5
                font = cv2.FONT_HERSHEY_SIMPLEX
                cv2.putText(
                    thumbnail,
                    f"{similarity:.4f}",
                    (10, 30),
                    font,
                    fontScale=font_scale,
                    color=(0, 255, 0),
                    thickness=2,
                )

                current_time = int(datetime.datetime.now().timestamp())
                cv2.imwrite(
                    f"debug/frames/trigger-{event_id}_{current_time}.jpg",
                    thumbnail,
                )

    def handle_request(self, topic, request_data):
        return None

    def expire_object(self, object_id, camera):
        pass
