"""Run recording maintainer and cleanup."""

import logging
import multiprocessing as mp
import signal
import threading
from types import FrameType
from typing import Optional

from setproctitle import setproctitle

from frigate.config import FrigateConfig
from frigate.review.maintainer import ReviewSegmentMaintainer
from frigate.util.services import listen

logger = logging.getLogger(__name__)


def manage_review_segments(config: FrigateConfig) -> None:
    stop_event = mp.Event()

    def receiveSignal(signalNumber: int, frame: Optional[FrameType]) -> None:
        logger.debug(f"Manage review segments process received signal {signalNumber}")
        stop_event.set()

    signal.signal(signal.SIGTERM, receiveSignal)
    signal.signal(signal.SIGINT, receiveSignal)

    threading.current_thread().name = "process:review_segment_manager"
    setproctitle("frigate.review_segment_manager")
    listen()

    maintainer = ReviewSegmentMaintainer(
        config,
        stop_event,
    )
    maintainer.start()
