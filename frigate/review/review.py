"""Run recording maintainer and cleanup."""

import logging
from multiprocessing.synchronize import Event as MpEvent

from frigate.config import FrigateConfig
from frigate.const import PROCESS_PRIORITY_MED
from frigate.review.maintainer import ReviewSegmentMaintainer
from frigate.util.process import FrigateProcess

logger = logging.getLogger(__name__)


class ReviewProcess(FrigateProcess):
    def __init__(self, config: FrigateConfig, stop_event: MpEvent) -> None:
        super().__init__(
            stop_event,
            PROCESS_PRIORITY_MED,
            name="frigate.review_segment_manager",
            daemon=True,
        )
        self.config = config

    def run(self) -> None:
        self.pre_run_setup(self.config.logger)
        maintainer = ReviewSegmentMaintainer(
            self.config,
            self.stop_event,
        )
        maintainer.start()
