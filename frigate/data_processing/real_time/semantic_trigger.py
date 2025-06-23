"""Real time processor to trigger alerts by matching embeddings."""

import datetime
import logging
from typing import Any

import cv2
import numpy as np

from frigate.comms.inter_process import InterProcessRequestor
from frigate.config import FrigateConfig
from frigate.config.classification import CameraSemanticSearchConfig
from frigate.util.builtin import EventsPerSecond, InferenceSpeed

from ..types import DataProcessorMetrics
from .api import RealTimeProcessorApi

logger = logging.getLogger(__name__)


class SemanticTriggerProcessor(RealTimeProcessorApi):
    def __init__(
        self,
        config: FrigateConfig,
        trigger_config: CameraSemanticSearchConfig,
        requestor: InterProcessRequestor,
        metrics: DataProcessorMetrics,
        embeddings,
    ):
        super().__init__(config, metrics)
        self.embeddings = embeddings
        self.trigger_config = trigger_config
        self.requestor = requestor
        self.image_inference_speed = InferenceSpeed(self.metrics.image_embeddings_speed)
        self.image_eps = EventsPerSecond()
        self.text_inference_speed = InferenceSpeed(self.metrics.text_embeddings_speed)
        self.text_eps = EventsPerSecond()
        self.trigger_embeddings: list[np.ndarray] = []
        self.last_run = datetime.datetime.now().timestamp()
        self.__generate_trigger_embeddings()

    def __generate_trigger_embeddings(self) -> None:
        self.image_eps.start()
        self.text_eps.start()
        for trigger in self.trigger_config.triggers:
            embedding = self.embeddings.embed_description(None, trigger, upsert=False)
            self.trigger_embeddings.append(embedding)

    def __update_metrics(self, duration: float) -> None:
        self.image_eps.update()
        self.image_inference_speed.update(duration)

    def process_frame(self, frame_data: dict[str, Any], frame: np.ndarray):
        # self.metrics.classification_cps[
        #     self.model_config.name
        # ].value = self.classifications_per_second.eps()
        camera = frame_data.get("camera")

        now = datetime.datetime.now().timestamp()

        rgb = cv2.cvtColor(frame, cv2.COLOR_YUV2RGB_I420)
        img_embedding = self.embeddings.embed_thumbnail(None, rgb, upsert=False)
        self.__update_metrics(datetime.datetime.now().timestamp() - now)

        if camera != "framecache":
            return

        for trigger_embedding in self.trigger_embeddings:
            for trigger in self.trigger_config.triggers:
                dot_product = np.dot(img_embedding, trigger_embedding)
                norm_img_embedding = np.linalg.norm(img_embedding)
                norm_trigger_embedding = np.linalg.norm(trigger_embedding)
                logger.info(
                    f"{camera}: Cosine similarity is {dot_product / (norm_img_embedding * norm_trigger_embedding)}"
                )

    def handle_request(self, topic, request_data):
        return None

    def expire_object(self, object_id, camera):
        pass
