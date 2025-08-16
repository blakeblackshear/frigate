"""Post processor for review items to get descriptions."""

import copy
import datetime
import logging
import os
import shutil
import threading
from pathlib import Path
from typing import Any

import cv2

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.config.camera.review import GenAIReviewConfig
from frigate.const import CACHE_DIR, CLIPS_DIR, UPDATE_REVIEW_DESCRIPTION
from frigate.data_processing.types import PostProcessDataEnum
from frigate.genai import GenAIClient
from frigate.models import ReviewSegment
from frigate.util.builtin import EventsPerSecond, InferenceSpeed

from ..post.api import PostProcessorApi
from ..types import DataProcessorMetrics

logger = logging.getLogger(__name__)


class ReviewDescriptionProcessor(PostProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        requestor: InterProcessRequestor,
        metrics: DataProcessorMetrics,
        client: GenAIClient,
    ):
        super().__init__(config, metrics, None)
        self.requestor = requestor
        self.metrics = metrics
        self.genai_client = client
        self.review_desc_speed = InferenceSpeed(self.metrics.review_desc_speed)
        self.review_descs_dps = EventsPerSecond()
        self.review_descs_dps.start()

    def process_data(self, data, data_type):
        self.metrics.review_desc_dps.value = self.review_descs_dps.eps()

        if data_type != PostProcessDataEnum.review:
            return

        camera = data["after"]["camera"]
        camera_config = self.config.cameras[camera]

        if not camera_config.review.genai.enabled:
            return

        id = data["after"]["id"]

        if data["type"] == "new" or data["type"] == "update":
            return
        else:
            final_data = data["after"]

            if (
                final_data["severity"] == "alert"
                and not camera_config.review.genai.alerts
            ):
                return
            elif (
                final_data["severity"] == "detection"
                and not camera_config.review.genai.detections
            ):
                return

            frames = self.get_cache_frames(
                camera, final_data["start_time"], final_data["end_time"]
            )

            if not frames:
                frames = [final_data["thumb_path"]]

            thumbs = []

            for idx, thumb_path in enumerate(frames):
                thumb_data = cv2.imread(thumb_path)
                ret, jpg = cv2.imencode(
                    ".jpg", thumb_data, [int(cv2.IMWRITE_JPEG_QUALITY), 100]
                )

                if ret:
                    thumbs.append(jpg.tobytes())

                if camera_config.review.genai.debug_save_thumbnails:
                    id = data["after"]["id"]
                    Path(os.path.join(CLIPS_DIR, f"genai-requests/{id}")).mkdir(
                        parents=True, exist_ok=True
                    )
                    shutil.copy(
                        thumb_path,
                        os.path.join(
                            CLIPS_DIR,
                            f"genai-requests/{id}/{idx}.webp",
                        ),
                    )

            # kickoff analysis
            self.review_descs_dps.update()
            threading.Thread(
                target=run_analysis,
                args=(
                    self.requestor,
                    self.genai_client,
                    self.review_desc_speed,
                    camera,
                    final_data,
                    thumbs,
                    camera_config.review.genai,
                ),
            ).start()

    def handle_request(self, topic, request_data):
        if topic == EmbeddingsRequestEnum.summarize_review.value:
            start_ts = request_data["start_ts"]
            end_ts = request_data["end_ts"]
            items: list[dict[str, Any]] = [
                r["data"]["metadata"]
                for r in (
                    ReviewSegment.select(ReviewSegment.data)
                    .where(
                        (ReviewSegment.data["metadata"].is_null(False))
                        & (ReviewSegment.start_time < end_ts)
                        & (ReviewSegment.end_time > start_ts)
                    )
                    .order_by(ReviewSegment.start_time.asc())
                    .dicts()
                    .iterator()
                )
            ]

            if len(items) == 0:
                logger.debug("No review items with metadata found during time period")
                return None

            important_items = list(
                filter(
                    lambda item: item.get("potential_threat_level", 0) > 0
                    or item.get("other_concerns"),
                    items,
                )
            )

            if not important_items:
                return "No concerns were found during this time period."

            return self.genai_client.generate_review_summary(
                start_ts, end_ts, important_items
            )
        else:
            return None

    def get_cache_frames(
        self, camera: str, start_time: float, end_time: float
    ) -> list[str]:
        preview_dir = os.path.join(CACHE_DIR, "preview_frames")
        file_start = f"preview_{camera}"
        start_file = f"{file_start}-{start_time}.webp"
        end_file = f"{file_start}-{end_time}.webp"
        all_frames = []

        for file in sorted(os.listdir(preview_dir)):
            if not file.startswith(file_start):
                continue

            if file < start_file:
                continue

            if file > end_file:
                break

            all_frames.append(os.path.join(preview_dir, file))

        frame_count = len(all_frames)
        if frame_count <= 10:
            return all_frames

        selected_frames = []
        step_size = (frame_count - 1) / 9

        for i in range(10):
            index = round(i * step_size)
            selected_frames.append(all_frames[index])

        return selected_frames


@staticmethod
def run_analysis(
    requestor: InterProcessRequestor,
    genai_client: GenAIClient,
    review_inference_speed: InferenceSpeed,
    camera: str,
    final_data: dict[str, str],
    thumbs: list[bytes],
    genai_config: GenAIReviewConfig,
) -> None:
    start = datetime.datetime.now().timestamp()
    metadata = genai_client.generate_review_description(
        {
            "id": final_data["id"],
            "camera": camera,
            "objects": final_data["data"]["objects"],
            "recognized_objects": final_data["data"]["sub_labels"],
            "zones": final_data["data"]["zones"],
            "timestamp": datetime.datetime.fromtimestamp(final_data["end_time"]),
        },
        thumbs,
        genai_config.additional_concerns,
        genai_config.preferred_language,
        genai_config.debug_save_thumbnails,
    )
    review_inference_speed.update(datetime.datetime.now().timestamp() - start)

    if not metadata:
        return None

    prev_data = copy.deepcopy(final_data)
    final_data["data"]["metadata"] = metadata.model_dump()
    requestor.send_data(
        UPDATE_REVIEW_DESCRIPTION,
        {
            "type": "genai",
            "before": {k: v for k, v in prev_data.items()},
            "after": {k: v for k, v in final_data.items()},
        },
    )
