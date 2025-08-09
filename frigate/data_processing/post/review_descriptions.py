"""Post processor for review items to get descriptions."""

import copy
import datetime
import logging
import os
import shutil
import threading
from pathlib import Path

import cv2

from frigate.config import FrigateConfig
from frigate.const import CLIPS_DIR
from frigate.data_processing.types import PostProcessDataEnum
from frigate.genai import GenAIClient

from ..post.api import PostProcessorApi

logger = logging.getLogger(__name__)


class ReviewDescriptionProcessor(PostProcessorApi):
    def __init__(self, config: FrigateConfig, metrics, client: GenAIClient):
        super().__init__(config, metrics, None)
        self.tracked_review_items: dict[str, list[tuple[int, bytes]]] = {}
        self.genai_client = client

    def process_data(self, data, data_type):
        if data_type != PostProcessDataEnum.review:
            return

        id = data["after"]["id"]

        if data["type"] == "new" or data["type"] == "update":
            if id not in self.tracked_review_items:
                self.tracked_review_items[id] = []

            thumb_time = data["after"]["data"]["thumb_time"]
            thumb_path = data["after"]["thumb_path"]

            if thumb_time and thumb_path:
                if (
                    len(self.tracked_review_items[id]) > 0
                    and self.tracked_review_items[id][0] == thumb_time
                ):
                    # we have already processed this thumbnail
                    return

                thumb_data = cv2.imread(thumb_path)
                ret, jpg = cv2.imencode(
                    ".jpg", thumb_data, [int(cv2.IMWRITE_JPEG_QUALITY), 100]
                )

                if ret:
                    self.tracked_review_items[id].append((thumb_time, jpg.tobytes()))

                if self.config.cameras[
                    data["after"]["camera"]
                ].review.genai.debug_save_thumbnails:
                    id = data["after"]["id"]
                    Path(os.path.join(CLIPS_DIR, f"genai-requests/{id}")).mkdir(
                        parents=True, exist_ok=True
                    )
                    shutil.copy(
                        thumb_path,
                        os.path.join(
                            CLIPS_DIR,
                            f"genai-requests/{id}/{thumb_time}.webp",
                        ),
                    )

        else:
            if id not in self.tracked_review_items:
                return

            final_data = data["after"]
            camera = final_data["camera"]

            if (
                final_data["severity"] == "alert"
                and not self.config.cameras[camera].review.genai.alerts
            ):
                self.tracked_review_items.pop(id)
                return
            elif (
                final_data["severity"] == "detection"
                and not self.config.cameras[camera].review.detections
            ):
                self.tracked_review_items.pop(id)
                return

            # kickoff analysis
            threading.Thread(
                target=self.run_analysis,
                args=(
                    self.genai_client,
                    camera,
                    final_data,
                    copy.copy([r[1] for r in self.tracked_review_items[id]]),
                ),
            ).start()
            self.tracked_review_items.pop(id)

    def run_analysis(
        self,
        genai_client: GenAIClient,
        camera: str,
        final_data: dict[str, str],
        thumbs: list[bytes],
    ) -> None:
        genai_client.generate_review_description(
            {
                "camera": camera,
                "objects": final_data["data"]["objects"],
                "recognized_objects": final_data["data"]["sub_labels"],
                "zones": final_data["data"]["zones"],
                "timestamp": datetime.datetime.fromtimestamp(final_data["end_time"]),
            },
            thumbs,
        )

    def handle_request(self, request_data):
        pass
