"""Run recording maintainer and cleanup."""

import logging

import frigate.util as util
from frigate.config import FrigateConfig
from frigate.review.maintainer import ReviewSegmentMaintainer

logger = logging.getLogger(__name__)


class ReviewProcess(util.Process):
    def __init__(self, config: FrigateConfig) -> None:
        super().__init__(name="frigate.review_segment_manager", daemon=True)
        self.config = config

    def run(self) -> None:
        self.pre_run_setup()
        maintainer = ReviewSegmentMaintainer(
            self.config,
            self.stop_event,
        )
        maintainer.start()
