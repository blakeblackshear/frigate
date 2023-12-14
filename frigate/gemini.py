"""Process captions through Google Gemini."""

import base64
import logging
import queue
import threading
import time
from multiprocessing import Queue
from multiprocessing.synchronize import Event as MpEvent

import google.generativeai as genai

from frigate.config import FrigateConfig
from frigate.models import Event

logger = logging.getLogger(__name__)


class GeminiProcessor(threading.Thread):
    """Handle gemini queue and post event updates."""

    def __init__(
        self,
        config: FrigateConfig,
        queue: Queue,
        stop_event: MpEvent,
    ) -> None:
        threading.Thread.__init__(self)
        self.name = "gemini_processor"
        self.config = config
        self.queue = queue
        self.stop_event = stop_event
        genai.configure(api_key=config.gemini.api_key)
        self.model = genai.GenerativeModel("gemini-pro-vision")

    def run(self) -> None:
        while not self.stop_event.is_set():
            try:
                (
                    camera,
                    event_data,
                ) = self.queue.get(timeout=1)
            except queue.Empty:
                continue

            camera_config = self.config.cameras[camera]

            st = time.time()
            thumbnail = {
                "mime_type": "image/jpeg",
                "data": base64.b64decode(event_data["thumbnail"]),
            }
            prompt = camera_config.gemini.object_prompts.get(
                event_data["label"], camera_config.gemini.prompt
            )

            response = self.model.generate_content(
                [thumbnail, prompt],
                generation_config=genai.types.GenerationConfig(
                    candidate_count=1,
                    stop_sequences=["."],
                ),
            )

            sub_label = response.text.strip()
            Event.update(sub_label=sub_label).where(
                Event.id == event_data["id"]
                and (
                    camera_config.gemini.override_existing or Event.sub_label.is_null()
                )
            ).execute()

            logger.info(
                "Generated sub label for %s on %s in %.4f seconds: %s",
                event_data["id"],
                camera,
                time.time() - st,
                sub_label,
            )
