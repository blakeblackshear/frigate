"""Maintain review segments in db."""

import logging
import threading
from multiprocessing.synchronize import Event as MpEvent

from frigate.comms.config_updater import ConfigSubscriber
from frigate.comms.detections_updater import DetectionSubscriber, DetectionTypeEnum
from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig

logger = logging.getLogger(__name__)


class ReviewSegmentMaintainer(threading.Thread):
    """Maintain review segments."""

    def __init__(self, config: FrigateConfig, stop_event: MpEvent):
        threading.Thread.__init__(self)
        self.name = "review_segment_maintainer"
        self.config = config

        # create communication for review segments
        self.requestor = InterProcessRequestor()
        self.config_subscriber = ConfigSubscriber("config/record/")
        self.detection_subscriber = DetectionSubscriber(DetectionTypeEnum.all)

        self.stop_event = stop_event
