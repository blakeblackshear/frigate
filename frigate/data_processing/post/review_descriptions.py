"""Post processor for review items to get descriptions."""

import logging

import cv2

from frigate.config import FrigateConfig
from frigate.data_processing.types import PostProcessDataEnum
from frigate.genai import GenAIConfig
from frigate.genai.ollama import OllamaClient

from ..post.api import PostProcessorApi

logger = logging.getLogger(__name__)


class ReviewDescriptionProcessor(PostProcessorApi):
    def __init__(self, config: FrigateConfig, metrics):
        super().__init__(config, metrics, None)
        self.tracked_review_items: dict[str, list[tuple[int, bytes]]] = {}
        self.genai_client = OllamaClient(
            GenAIConfig(
                enabled=True, model="gemma3:4b", base_url="http://192.168.50.107:11434"
            )
        )

    def process_data(self, data, data_type):
        if data_type != PostProcessDataEnum.review:
            return

        logger.info(f"processing review {data['type']} on {data['after']['camera']}")

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
        else:
            if id not in self.tracked_review_items:
                return

            final_data = data["after"]
            self.genai_client.generate_review_description(
                {
                    "camera": final_data["camera"],
                    "objects": final_data["data"]["objects"] + final_data["data"]["sub_labels"],
                    "zones": final_data["data"]["zones"],
                },
                [r[1] for r in self.tracked_review_items[id]],
            )
            self.tracked_review_items.pop(id)

    def handle_request(self, request_data):
        pass
