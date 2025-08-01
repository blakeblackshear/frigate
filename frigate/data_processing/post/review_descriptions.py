"""Post processor for review items to get descriptions."""

import logging
from typing import Any

from frigate.data_processing.types import PostProcessDataEnum

from ..post.api import PostProcessorApi

logger = logging.getLogger(__name__)


class ReviewDescriptionProcessor(PostProcessorApi):
    def __init__(self, config, metrics):
        super().__init__(config, metrics, None)
        self.tracked_review_items: dict[str, list[Any]] = {}

    def process_data(self, data, data_type):
        if data_type != PostProcessDataEnum.review:
            return

        logger.info(f"processor is looking at {data}")

    def handle_request(self, request_data):
        pass
