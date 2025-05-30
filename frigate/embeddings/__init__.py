"""SQLite-vec embeddings database."""

import base64
import json
import logging
import multiprocessing as mp
import os
import signal
import threading
from types import FrameType
from typing import Any, Optional, Union

import regex
from pathvalidate import ValidationError, sanitize_filename
from setproctitle import setproctitle

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum, EmbeddingsRequestor
from frigate.config import FrigateConfig
from frigate.const import CONFIG_DIR, FACE_DIR
from frigate.data_processing.types import DataProcessorMetrics
from frigate.db.sqlitevecq import SqliteVecQueueDatabase
from frigate.models import Event, Recordings
from frigate.util.builtin import serialize
from frigate.util.services import listen

from .maintainer import EmbeddingMaintainer
from .util import ZScoreNormalization

logger = logging.getLogger(__name__)


def manage_embeddings(config: FrigateConfig, metrics: DataProcessorMetrics) -> None:
    stop_event = mp.Event()

    def receiveSignal(signalNumber: int, frame: Optional[FrameType]) -> None:
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = "process:embeddings_manager"
    setproctitle("frigate.embeddings_manager")
    listen()

    # Configure Frigate DB
    db = SqliteVecQueueDatabase(
        config.database.path,
        pragmas={
            "auto_vacuum": "FULL",  # Does not defragment database
            "cache_size": -512 * 1000,  # 512MB of cache
            "synchronous": "NORMAL",  # Safe when using WAL https://www.sqlite.org/pragma.html#pragma_synchronous
        },
        timeout=max(60, 10 * len([c for c in config.cameras.values() if c.enabled])),
        load_vec_extension=True,
    )
    models = [Event, Recordings]
    db.bind(models)

    maintainer = EmbeddingMaintainer(
        db,
        config,
        metrics,
        stop_event,
    )
    maintainer.start()


class EmbeddingsContext:
    def __init__(self, db: SqliteVecQueueDatabase):
        self.db = db
        self.thumb_stats = ZScoreNormalization()
        self.desc_stats = ZScoreNormalization()
        self.requestor = EmbeddingsRequestor()

        # load stats from disk
        try:
            with open(os.path.join(CONFIG_DIR, ".search_stats.json"), "r") as f:
                data = json.loads(f.read())
                self.thumb_stats.from_dict(data["thumb_stats"])
                self.desc_stats.from_dict(data["desc_stats"])
        except FileNotFoundError:
            pass

    def stop(self):
        """Write the stats to disk as JSON on exit."""
        contents = {
            "thumb_stats": self.thumb_stats.to_dict(),
            "desc_stats": self.desc_stats.to_dict(),
        }
        with open(os.path.join(CONFIG_DIR, ".search_stats.json"), "w") as f:
            json.dump(contents, f)
        self.requestor.stop()

    def search_thumbnail(
        self, query: Union[Event, str], event_ids: list[str] = None
    ) -> list[tuple[str, float]]:
        if query.__class__ == Event:
            cursor = self.db.execute_sql(
                """
                SELECT thumbnail_embedding FROM vec_thumbnails WHERE id = ?
                """,
                [query.id],
            )

            row = cursor.fetchone() if cursor else None

            if row:
                query_embedding = row[0]
            else:
                # If no embedding found, generate it and return it
                data = self.requestor.send_data(
                    EmbeddingsRequestEnum.embed_thumbnail.value,
                    {"id": str(query.id), "thumbnail": str(query.thumbnail)},
                )

                if not data:
                    return []

                query_embedding = serialize(data)
        else:
            data = self.requestor.send_data(
                EmbeddingsRequestEnum.generate_search.value, query
            )

            if not data:
                return []

            query_embedding = serialize(data)

        sql_query = """
            SELECT
                id,
                distance
            FROM vec_thumbnails
            WHERE thumbnail_embedding MATCH ?
                AND k = 100
        """

        # Add the IN clause if event_ids is provided and not empty
        # this is the only filter supported by sqlite-vec as of 0.1.3
        # but it seems to be broken in this version
        if event_ids:
            sql_query += " AND id IN ({})".format(",".join("?" * len(event_ids)))

        # order by distance DESC is not implemented in this version of sqlite-vec
        # when it's implemented, we can use cosine similarity
        sql_query += " ORDER BY distance"

        parameters = [query_embedding] + event_ids if event_ids else [query_embedding]

        results = self.db.execute_sql(sql_query, parameters).fetchall()

        return results

    def search_description(
        self, query_text: str, event_ids: list[str] = None
    ) -> list[tuple[str, float]]:
        data = self.requestor.send_data(
            EmbeddingsRequestEnum.generate_search.value, query_text
        )

        if not data:
            return []

        query_embedding = serialize(data)

        # Prepare the base SQL query
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
        if event_ids:
            sql_query += " AND id IN ({})".format(",".join("?" * len(event_ids)))

        # order by distance DESC is not implemented in this version of sqlite-vec
        # when it's implemented, we can use cosine similarity
        sql_query += " ORDER BY distance"

        parameters = [query_embedding] + event_ids if event_ids else [query_embedding]

        results = self.db.execute_sql(sql_query, parameters).fetchall()

        return results

    def register_face(self, face_name: str, image_data: bytes) -> dict[str, Any]:
        return self.requestor.send_data(
            EmbeddingsRequestEnum.register_face.value,
            {
                "face_name": face_name,
                "image": base64.b64encode(image_data).decode("ASCII"),
            },
        )

    def recognize_face(self, image_data: bytes) -> dict[str, Any]:
        return self.requestor.send_data(
            EmbeddingsRequestEnum.recognize_face.value,
            {
                "image": base64.b64encode(image_data).decode("ASCII"),
            },
        )

    def get_face_ids(self, name: str) -> list[str]:
        sql_query = f"""
            SELECT
                id
            FROM vec_descriptions
            WHERE id LIKE '%{name}%'
        """

        return self.db.execute_sql(sql_query).fetchall()

    def reprocess_face(self, face_file: str) -> dict[str, Any]:
        return self.requestor.send_data(
            EmbeddingsRequestEnum.reprocess_face.value, {"image_file": face_file}
        )

    def clear_face_classifier(self) -> None:
        self.requestor.send_data(
            EmbeddingsRequestEnum.clear_face_classifier.value, None
        )

    def delete_face_ids(self, face: str, ids: list[str]) -> None:
        folder = os.path.join(FACE_DIR, face)
        for id in ids:
            file_path = os.path.join(folder, id)

            if os.path.isfile(file_path):
                os.unlink(file_path)

        if face != "train" and len(os.listdir(folder)) == 0:
            os.rmdir(folder)

        self.requestor.send_data(
            EmbeddingsRequestEnum.clear_face_classifier.value, None
        )

    def rename_face(self, old_name: str, new_name: str) -> None:
        valid_name_pattern = r"^[\p{L}\p{N}\s'_-]{1,50}$"

        try:
            sanitized_old_name = sanitize_filename(old_name, replacement_text="_")
            sanitized_new_name = sanitize_filename(new_name, replacement_text="_")
        except ValidationError as e:
            raise ValueError(f"Invalid face name: {str(e)}")

        if not regex.match(valid_name_pattern, old_name):
            raise ValueError(f"Invalid old face name: {old_name}")
        if not regex.match(valid_name_pattern, new_name):
            raise ValueError(f"Invalid new face name: {new_name}")
        if sanitized_old_name != old_name:
            raise ValueError(f"Old face name contains invalid characters: {old_name}")
        if sanitized_new_name != new_name:
            raise ValueError(f"New face name contains invalid characters: {new_name}")

        old_path = os.path.normpath(os.path.join(FACE_DIR, old_name))
        new_path = os.path.normpath(os.path.join(FACE_DIR, new_name))

        # Prevent path traversal
        if not old_path.startswith(
            os.path.normpath(FACE_DIR)
        ) or not new_path.startswith(os.path.normpath(FACE_DIR)):
            raise ValueError("Invalid path detected")

        if not os.path.exists(old_path):
            raise ValueError(f"Face {old_name} not found.")

        os.rename(old_path, new_path)

        self.requestor.send_data(
            EmbeddingsRequestEnum.clear_face_classifier.value, None
        )

    def update_description(self, event_id: str, description: str) -> None:
        self.requestor.send_data(
            EmbeddingsRequestEnum.embed_description.value,
            {"id": event_id, "description": description},
        )

    def reprocess_plate(self, event: dict[str, Any]) -> dict[str, Any]:
        return self.requestor.send_data(
            EmbeddingsRequestEnum.reprocess_plate.value, {"event": event}
        )

    def reindex_embeddings(self) -> dict[str, Any]:
        return self.requestor.send_data(EmbeddingsRequestEnum.reindex.value, {})
