"""Post processor for review items to get descriptions."""

import copy
import datetime
import logging
import math
import os
import shutil
import threading
from pathlib import Path
from typing import Any

import cv2
from peewee import DoesNotExist
from titlecase import titlecase

from frigate.comms.embeddings_updater import EmbeddingsRequestEnum
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.config.camera import CameraConfig
from frigate.config.camera.review import GenAIReviewConfig, ImageSourceEnum
from frigate.const import CACHE_DIR, CLIPS_DIR, UPDATE_REVIEW_DESCRIPTION
from frigate.data_processing.types import PostProcessDataEnum
from frigate.genai import GenAIClient
from frigate.models import Recordings, ReviewSegment
from frigate.util.builtin import EventsPerSecond, InferenceSpeed
from frigate.util.image import get_image_from_recording

from ..post.api import PostProcessorApi
from ..types import DataProcessorMetrics

logger = logging.getLogger(__name__)

RECORDING_BUFFER_EXTENSION_PERCENT = 0.10
MIN_RECORDING_DURATION = 10


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

    def calculate_frame_count(
        self,
        camera: str,
        image_source: ImageSourceEnum = ImageSourceEnum.preview,
        height: int = 480,
    ) -> int:
        """Calculate optimal number of frames based on context size, image source, and resolution.

        Token usage varies by resolution: larger images (ultrawide aspect ratios) use more tokens.
        Estimates ~1 token per 1250 pixels. Targets 98% context utilization with safety margin.
        Capped at 20 frames.
        """
        context_size = self.genai_client.get_context_size()
        camera_config = self.config.cameras[camera]

        detect_width = camera_config.detect.width
        detect_height = camera_config.detect.height
        aspect_ratio = detect_width / detect_height

        if image_source == ImageSourceEnum.recordings:
            if aspect_ratio >= 1:
                # Landscape or square: constrain height
                width = int(height * aspect_ratio)
            else:
                # Portrait: constrain width
                width = height
                height = int(width / aspect_ratio)
        else:
            if aspect_ratio >= 1:
                # Landscape or square: constrain height
                target_height = 180
                width = int(target_height * aspect_ratio)
                height = target_height
            else:
                # Portrait: constrain width
                target_width = 180
                width = target_width
                height = int(target_width / aspect_ratio)

        pixels_per_image = width * height
        tokens_per_image = pixels_per_image / 1250
        prompt_tokens = 3800
        response_tokens = 300
        available_tokens = context_size - prompt_tokens - response_tokens
        max_frames = int(available_tokens / tokens_per_image)

        return min(max(max_frames, 3), 20)

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

            image_source = camera_config.review.genai.image_source

            if image_source == ImageSourceEnum.recordings:
                duration = final_data["end_time"] - final_data["start_time"]
                buffer_extension = min(5, duration * RECORDING_BUFFER_EXTENSION_PERCENT)

                # Ensure minimum total duration for short review items
                # This provides better context for brief events
                total_duration = duration + (2 * buffer_extension)
                if total_duration < MIN_RECORDING_DURATION:
                    # Expand buffer to reach minimum duration, still respecting max of 5s per side
                    additional_buffer_per_side = (MIN_RECORDING_DURATION - duration) / 2
                    buffer_extension = min(5, additional_buffer_per_side)

                thumbs = self.get_recording_frames(
                    camera,
                    final_data["start_time"] - buffer_extension,
                    final_data["end_time"] + buffer_extension,
                    height=480,  # Use 480p for good balance between quality and token usage
                )

                if not thumbs:
                    # Fallback to preview frames if no recordings available
                    logger.warning(
                        f"No recording frames found for {camera}, falling back to preview frames"
                    )
                    thumbs = self.get_preview_frames_as_bytes(
                        camera,
                        final_data["start_time"],
                        final_data["end_time"],
                        final_data["thumb_path"],
                        id,
                        camera_config.review.genai.debug_save_thumbnails,
                    )
                elif camera_config.review.genai.debug_save_thumbnails:
                    # Save debug thumbnails for recordings
                    Path(os.path.join(CLIPS_DIR, "genai-requests", id)).mkdir(
                        parents=True, exist_ok=True
                    )
                    for idx, frame_bytes in enumerate(thumbs):
                        with open(
                            os.path.join(CLIPS_DIR, f"genai-requests/{id}/{idx}.jpg"),
                            "wb",
                        ) as f:
                            f.write(frame_bytes)
            else:
                # Use preview frames
                thumbs = self.get_preview_frames_as_bytes(
                    camera,
                    final_data["start_time"],
                    final_data["end_time"],
                    final_data["thumb_path"],
                    id,
                    camera_config.review.genai.debug_save_thumbnails,
                )

            # kickoff analysis
            self.review_descs_dps.update()
            threading.Thread(
                target=run_analysis,
                args=(
                    self.requestor,
                    self.genai_client,
                    self.review_desc_speed,
                    camera_config,
                    final_data,
                    thumbs,
                    camera_config.review.genai,
                    list(self.config.model.merged_labelmap.values()),
                    self.config.model.all_attributes,
                ),
            ).start()

    def handle_request(self, topic, request_data):
        if topic == EmbeddingsRequestEnum.summarize_review.value:
            start_ts = request_data["start_ts"]
            end_ts = request_data["end_ts"]
            logger.debug(
                f"Found GenAI Review Summary request for {start_ts} to {end_ts}"
            )

            # Query all review segments with camera and time information
            segments: list[dict[str, Any]] = [
                {
                    "camera": r["camera"].replace("_", " ").title(),
                    "start_time": r["start_time"],
                    "end_time": r["end_time"],
                    "metadata": r["data"]["metadata"],
                }
                for r in (
                    ReviewSegment.select(
                        ReviewSegment.camera,
                        ReviewSegment.start_time,
                        ReviewSegment.end_time,
                        ReviewSegment.data,
                    )
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

            if len(segments) == 0:
                logger.debug("No review items with metadata found during time period")
                return "No activity was found during this time period."

            # Identify primary items (important items that need review)
            primary_segments = [
                seg
                for seg in segments
                if seg["metadata"].get("potential_threat_level", 0) > 0
                or seg["metadata"].get("other_concerns")
            ]

            if not primary_segments:
                return "No concerns were found during this time period."

            # Build hierarchical structure: each primary event with its contextual items
            events_with_context = []

            for primary_seg in primary_segments:
                # Start building the primary event structure
                primary_item = copy.deepcopy(primary_seg["metadata"])
                primary_item["camera"] = primary_seg["camera"]
                primary_item["start_time"] = primary_seg["start_time"]
                primary_item["end_time"] = primary_seg["end_time"]

                # Find overlapping contextual items from other cameras
                primary_start = primary_seg["start_time"]
                primary_end = primary_seg["end_time"]
                primary_camera = primary_seg["camera"]
                contextual_items = []
                seen_contextual_cameras = set()

                for seg in segments:
                    seg_camera = seg["camera"]

                    if seg_camera == primary_camera:
                        continue

                    if seg in primary_segments:
                        continue

                    seg_start = seg["start_time"]
                    seg_end = seg["end_time"]

                    if seg_start < primary_end and primary_start < seg_end:
                        # Avoid duplicates if same camera has multiple overlapping segments
                        if seg_camera not in seen_contextual_cameras:
                            contextual_item = copy.deepcopy(seg["metadata"])
                            contextual_item["camera"] = seg_camera
                            contextual_item["start_time"] = seg_start
                            contextual_item["end_time"] = seg_end
                            contextual_items.append(contextual_item)
                            seen_contextual_cameras.add(seg_camera)

                # Add context array to primary item
                primary_item["context"] = contextual_items
                events_with_context.append(primary_item)

            total_context_items = sum(
                len(event.get("context", [])) for event in events_with_context
            )
            logger.debug(
                f"Summary includes {len(events_with_context)} primary events with "
                f"{total_context_items} total contextual items"
            )

            if self.config.review.genai.debug_save_thumbnails:
                Path(
                    os.path.join(CLIPS_DIR, "genai-requests", f"{start_ts}-{end_ts}")
                ).mkdir(parents=True, exist_ok=True)

            return self.genai_client.generate_review_summary(
                start_ts,
                end_ts,
                events_with_context,
                self.config.review.genai.preferred_language,
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
        desired_frame_count = self.calculate_frame_count(camera)

        if frame_count <= desired_frame_count:
            return all_frames

        selected_frames = []
        step_size = (frame_count - 1) / (desired_frame_count - 1)

        for i in range(desired_frame_count):
            index = round(i * step_size)
            selected_frames.append(all_frames[index])

        return selected_frames

    def get_recording_frames(
        self,
        camera: str,
        start_time: float,
        end_time: float,
        height: int = 480,
    ) -> list[bytes]:
        """Get frames from recordings at specified timestamps."""
        duration = end_time - start_time
        desired_frame_count = self.calculate_frame_count(
            camera, ImageSourceEnum.recordings, height
        )

        # Calculate evenly spaced timestamps throughout the duration
        if desired_frame_count == 1:
            timestamps = [start_time + duration / 2]
        else:
            step = duration / (desired_frame_count - 1)
            timestamps = [start_time + (i * step) for i in range(desired_frame_count)]

        def extract_frame_from_recording(ts: float) -> bytes | None:
            """Extract a single frame from recording at given timestamp."""
            try:
                recording = (
                    Recordings.select(
                        Recordings.path,
                        Recordings.start_time,
                    )
                    .where((ts >= Recordings.start_time) & (ts <= Recordings.end_time))
                    .where(Recordings.camera == camera)
                    .order_by(Recordings.start_time.desc())
                    .limit(1)
                    .get()
                )

                time_in_segment = ts - recording.start_time
                return get_image_from_recording(
                    self.config.ffmpeg,
                    recording.path,
                    time_in_segment,
                    "mjpeg",
                    height=height,
                )
            except DoesNotExist:
                return None

        frames = []

        for timestamp in timestamps:
            try:
                # Try to extract frame at exact timestamp
                image_data = extract_frame_from_recording(timestamp)

                if not image_data:
                    # Try with rounded timestamp as fallback
                    rounded_timestamp = math.ceil(timestamp)
                    image_data = extract_frame_from_recording(rounded_timestamp)

                if image_data:
                    frames.append(image_data)
                else:
                    logger.warning(
                        f"No recording found for {camera} at timestamp {timestamp}"
                    )
            except Exception as e:
                logger.error(
                    f"Error extracting frame from recording for {camera} at {timestamp}: {e}"
                )
                continue

        return frames

    def get_preview_frames_as_bytes(
        self,
        camera: str,
        start_time: float,
        end_time: float,
        thumb_path_fallback: str,
        review_id: str,
        save_debug: bool,
    ) -> list[bytes]:
        """Get preview frames and convert them to JPEG bytes.

        Args:
            camera: Camera name
            start_time: Start timestamp
            end_time: End timestamp
            thumb_path_fallback: Fallback thumbnail path if no preview frames found
            review_id: Review item ID for debug saving
            save_debug: Whether to save debug thumbnails

        Returns:
            List of JPEG image bytes
        """
        frame_paths = self.get_cache_frames(camera, start_time, end_time)
        if not frame_paths:
            frame_paths = [thumb_path_fallback]

        thumbs = []
        for idx, thumb_path in enumerate(frame_paths):
            thumb_data = cv2.imread(thumb_path)
            ret, jpg = cv2.imencode(
                ".jpg", thumb_data, [int(cv2.IMWRITE_JPEG_QUALITY), 100]
            )
            if ret:
                thumbs.append(jpg.tobytes())

            if save_debug:
                Path(os.path.join(CLIPS_DIR, "genai-requests", review_id)).mkdir(
                    parents=True, exist_ok=True
                )
                shutil.copy(
                    thumb_path,
                    os.path.join(CLIPS_DIR, f"genai-requests/{review_id}/{idx}.webp"),
                )

        return thumbs


@staticmethod
def run_analysis(
    requestor: InterProcessRequestor,
    genai_client: GenAIClient,
    review_inference_speed: InferenceSpeed,
    camera_config: CameraConfig,
    final_data: dict[str, str],
    thumbs: list[bytes],
    genai_config: GenAIReviewConfig,
    labelmap_objects: list[str],
    attribute_labels: list[str],
) -> None:
    start = datetime.datetime.now().timestamp()

    # Format zone names using zone config friendly names if available
    formatted_zones = []
    for zone_name in final_data["data"]["zones"]:
        if zone_name in camera_config.zones:
            formatted_zones.append(
                camera_config.zones[zone_name].get_formatted_name(zone_name)
            )

    analytics_data = {
        "id": final_data["id"],
        "camera": camera_config.get_formatted_name(),
        "zones": formatted_zones,
        "start": datetime.datetime.fromtimestamp(final_data["start_time"]).strftime(
            "%A, %I:%M %p"
        ),
        "duration": round(final_data["end_time"] - final_data["start_time"]),
    }

    unified_objects = []

    objects_list = final_data["data"]["objects"]
    sub_labels_list = final_data["data"]["sub_labels"]

    for i, verified_label in enumerate(final_data["data"]["verified_objects"]):
        object_type = verified_label.replace("-verified", "").replace("_", " ")
        name = titlecase(sub_labels_list[i].replace("_", " "))
        unified_objects.append(f"{name} ({object_type})")

    for label in objects_list:
        if "-verified" in label:
            continue
        elif label in labelmap_objects:
            object_type = titlecase(label.replace("_", " "))

            if label in attribute_labels:
                unified_objects.append(f"{object_type} (delivery/service)")
            else:
                unified_objects.append(object_type)

    analytics_data["unified_objects"] = unified_objects

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
