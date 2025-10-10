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

    def calculate_frame_count(self) -> int:
        """Calculate optimal number of frames based on context size."""
        # With our preview images (height of 180px) each image should be ~100 tokens per image
        # We want to be conservative to not have too long of query times with too many images
        context_size = self.genai_client.get_context_size()

        if context_size > 10000:
            return 20
        elif context_size > 6000:
            return 16
        elif context_size > 4000:
            return 12
        else:
            return 8

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
                    Path(os.path.join(CLIPS_DIR, "genai-requests", f"{id}")).mkdir(
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
                    list(self.config.model.merged_labelmap.values()),
                ),
            ).start()

    def handle_request(self, topic, request_data):
        if topic == EmbeddingsRequestEnum.summarize_review.value:
            start_ts = request_data["start_ts"]
            end_ts = request_data["end_ts"]
            logger.debug(
                f"Found GenAI Review Summary request for {start_ts} to {end_ts}"
            )
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
                return "No activity was found during this time."

            important_items = list(
                filter(
                    lambda item: item.get("potential_threat_level", 0) > 0
                    or item.get("other_concerns"),
                    items,
                )
            )

            if not important_items:
                return "No concerns were found during this time period."

            if self.config.review.genai.debug_save_thumbnails:
                Path(
                    os.path.join(CLIPS_DIR, "genai-requests", f"{start_ts}-{end_ts}")
                ).mkdir(parents=True, exist_ok=True)

            return self.genai_client.generate_review_summary(
                start_ts,
                end_ts,
                important_items,
                self.config.review.genai.debug_save_thumbnails,
            )
        else:
            return None

    def get_cache_frames(
        self,
        camera: str,
        start_time: float,
        end_time: float,
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
                if len(all_frames):
                    all_frames[0] = os.path.join(preview_dir, file)
                else:
                    all_frames.append(os.path.join(preview_dir, file))

                continue

            if file > end_file:
                all_frames.append(os.path.join(preview_dir, file))
                break

            all_frames.append(os.path.join(preview_dir, file))

        frame_count = len(all_frames)
        desired_frame_count = self.calculate_frame_count()

        if frame_count <= desired_frame_count:
            return all_frames

        selected_frames = []
        step_size = (frame_count - 1) / (desired_frame_count - 1)

        for i in range(desired_frame_count):
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
    labelmap_objects: list[str],
) -> None:
    start = datetime.datetime.now().timestamp()
    analytics_data = {
        "id": final_data["id"],
        "camera": camera,
        "zones": final_data["data"]["zones"],
        "start": datetime.datetime.fromtimestamp(final_data["start_time"]).strftime(
            "%A, %I:%M %p"
        ),
        "duration": round(final_data["end_time"] - final_data["start_time"]),
    }

    objects = []
    named_objects = []

    objects_list = final_data["data"]["objects"]
    sub_labels_list = final_data["data"]["sub_labels"]

    for label in objects_list:
        if "-verified" in label:
            continue
        elif label in labelmap_objects:
            objects.append(label.replace("_", " ").title())

    for i, verified_label in enumerate(final_data["data"]["verified_objects"]):
        named_objects.append(
            f"{sub_labels_list[i].replace('_', ' ').title()} ({verified_label.replace('-verified', '')})"
        )

    analytics_data["objects"] = objects
    analytics_data["recognized_objects"] = named_objects

    metadata = genai_client.generate_review_description(
        analytics_data,
        thumbs,
        genai_config.additional_concerns,
        genai_config.preferred_language,
        genai_config.debug_save_thumbnails,
        genai_config.activity_context_prompt,
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
