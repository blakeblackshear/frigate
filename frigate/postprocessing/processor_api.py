import logging
from abc import ABC, abstractmethod

import numpy as np

from frigate.config import FrigateConfig

logger = logging.getLogger(__name__)


class ProcessorApi(ABC):
    @abstractmethod
    def __init__(self, config: FrigateConfig):
        self.config = config
        pass

    @abstractmethod
    def process_frame(self, obj_data: dict[str, any], frame: np.ndarray):
        pass
