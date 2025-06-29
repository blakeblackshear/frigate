"""Real time processor to trigger alerts by matching embeddings."""

import datetime
import logging
from typing import Any

import cv2
import numpy as np
from peewee import DoesNotExist

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.data_processing.types import PostProcessDataEnum
from frigate.db.sqlitevecq import SqliteVecQueueDatabase
from frigate.embeddings.util import ZScoreNormalization
from frigate.models import Event, Trigger
from frigate.util.builtin import cosine_distance
from frigate.util.path import get_event_thumbnail_bytes

from ..post.api import PostProcessorApi
from ..types import DataProcessorMetrics

logger = logging.getLogger(__name__)

WRITE_DEBUG_IMAGES = True


class SemanticTriggerProcessor(PostProcessorApi):
    def __init__(
        self,
        db: SqliteVecQueueDatabase,
        config: FrigateConfig,
        requestor: InterProcessRequestor,
        metrics: DataProcessorMetrics,
        embeddings,
    ):
        super().__init__(config, metrics, None)
        self.db = db
        self.embeddings = embeddings
        self.requestor = requestor
        self.trigger_embeddings: list[np.ndarray] = []

        self.thumb_stats = ZScoreNormalization()

    def process_data(
        self, data: dict[str, Any], data_type: PostProcessDataEnum
    ) -> None:
        event_id = data["event_id"]
        camera = data["camera"]
        process_type = data["type"]
        logger.info(
            f"semantic trigger event_id: {event_id}, type: {process_type}, camera: {camera}"
        )

        # TODO: check if triggers exist for this camera, bail if none

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
            logger.warning(f"No embeddings found for event_id: {event_id}")
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
            logger.debug(f"Processing trigger: {trigger['camera']}_{trigger['name']}")

            trigger_embedding = np.frombuffer(trigger["embedding"], dtype=np.float32)

            # Determine which embedding to compare based on trigger type
            if trigger["type"] == "image" and thumbnail_embedding is not None:
                data_embedding = thumbnail_embedding
                normalized_distance = self.thumb_stats.normalize(
                    [cosine_distance(data_embedding, trigger_embedding)],
                    save_stats=False,
                )[0]
            elif trigger["type"] == "text" and description_embedding is not None:
                data_embedding = description_embedding
                normalized_distance = cosine_distance(data_embedding, trigger_embedding)
            elif trigger["type"] == "both":
                # For "both" type triggers, check both embeddings and use the best match
                similarities = []
                similarity_sources = []  # Track which embedding produced each similarity

                if thumbnail_embedding is not None:
                    thumb_distance = cosine_distance(
                        thumbnail_embedding, trigger_embedding
                    )
                    thumb_normalized = self.thumb_stats.normalize(
                        [thumb_distance], save_stats=False
                    )[0]
                    thumb_similarity = 1 - thumb_normalized
                    similarities.append(thumb_similarity)
                    similarity_sources.append("thumbnail")

                if description_embedding is not None:
                    desc_distance = cosine_distance(
                        description_embedding, trigger_embedding
                    )
                    desc_similarity = 1 - desc_distance
                    similarities.append(desc_similarity)
                    similarity_sources.append("description")

                if not similarities:
                    continue  # Skip if no valid embeddings

                # Find the best similarity and its source
                max_similarity_idx = similarities.index(max(similarities))
                similarity = similarities[max_similarity_idx]
                selected_source = similarity_sources[max_similarity_idx]
                normalized_distance = 1 - similarity

                # Debug log showing all similarities and which was selected
                if len(similarities) > 1:
                    logger.debug(
                        f"Both embeddings available for trigger '{trigger['name']}': "
                        f"thumbnail={similarities[0]:.4f}, description={similarities[1]:.4f}, "
                        f"selected={selected_source} with similarity={similarity:.4f}"
                    )
                else:
                    logger.debug(
                        f"Single embedding available for trigger '{trigger['name']}': "
                        f"{selected_source}={similarity:.4f}"
                    )
            else:
                # Skip trigger if embedding type doesn't match available data
                continue

            similarity = 1 - normalized_distance

            logger.debug(
                f"Trigger for {trigger['data'] if trigger['type'] == 'text' else 'image/both'} "
                f"(camera: {trigger['camera']}): normalized: {normalized_distance:.4f}, "
                f"similarity: {similarity:.4f}, threshold: {trigger['threshold']}"
            )

            # Check if similarity meets threshold
            if similarity >= trigger["threshold"]:
                logger.info(
                    f"Trigger '{trigger['name']}' activated with similarity {similarity:.4f}"
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

                if False:
                    if type == "image":
                        sql_query = """
                            SELECT
                                id,
                                distance
                            FROM vec_thumbnails
                            WHERE thumbnail_embedding MATCH ?
                                AND k = 100
                        """
                    elif type == "text":
                        sql_query = """
                            SELECT
                                id,
                                distance
                            FROM vec_descriptions
                            WHERE description_embedding MATCH ?
                                AND k = 100
                        """

                    # Add the IN clause if event_ids is provided and not empty
                    # this is the only filter supported by sqlite-vec as of 0.1.3
                    # but it seems to be broken in this version
                    # if event_id:
                    #     sql_query += " AND id IN ({})".format(",".join("?" * len(event_id)))

                    # order by distance DESC is not implemented in this version of sqlite-vec
                    # when it's implemented, we can use cosine similarity
                    sql_query += " ORDER BY distance"

                    parameters = [
                        trigger_embedding
                    ]  # + event_ids if event_ids else [query_embedding]

                    results = self.db.execute_sql(sql_query, parameters).fetchall()
                    # Extract raw distances
                    raw_distances = [r[1] for r in results]

                    # Normalize
                    normalized_distances = self.thumb_stats.normalize(
                        raw_distances, save_stats=False
                    )

                    # Pair with IDs
                    normalized_results = list(
                        zip([r[0] for r in results], normalized_distances)
                    )

                    logger.info(
                        f"Semantic trigger results for event_id {event_id}: {len(normalized_results)} matches found."
                    )

                    # Optional: Log top few for inspection
                    for thumb_id, norm_score in normalized_results[:5]:
                        logger.debug(
                            f"Normalized match: {thumb_id} → z-score: {1 - norm_score:.4f}"
                        )

    def handle_request(self, topic, request_data):
        return None

    def expire_object(self, object_id, camera):
        pass
