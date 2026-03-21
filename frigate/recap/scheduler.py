"""Scheduled daily recap generation.

Runs as a background thread, checks once per minute if it's time
to generate recaps for the previous day.
"""

import logging
import random
import string
import threading
import time
from datetime import datetime, timedelta

from frigate.config import FrigateConfig
from frigate.recap.recap import RecapGenerator

logger = logging.getLogger(__name__)


class RecapScheduler(threading.Thread):
    """Triggers daily recap generation at the configured time."""

    def __init__(self, config: FrigateConfig):
        super().__init__(daemon=True, name="recap_scheduler")
        self.config = config
        self._last_run_date = None

    def run(self):
        recap_cfg = self.config.recap
        if not recap_cfg.enabled or not recap_cfg.auto_generate:
            logger.info("recap scheduler not enabled, exiting")
            return

        hour, minute = (int(x) for x in recap_cfg.schedule_time.split(":"))
        logger.info(
            "recap scheduler started, will run daily at %02d:%02d", hour, minute
        )

        while True:
            now = datetime.now()
            today = now.date()

            # check if it's time and we haven't already run today
            if (
                now.hour == hour
                and now.minute == minute
                and self._last_run_date != today
            ):
                self._last_run_date = today
                self._generate_all()

            # sleep until next minute
            time.sleep(60)

    def _generate_all(self):
        recap_cfg = self.config.recap
        yesterday = datetime.now() - timedelta(days=1)
        start = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)

        # figure out which cameras to process
        camera_names = (
            list(recap_cfg.cameras)
            if recap_cfg.cameras
            else list(self.config.cameras.keys())
        )

        logger.info(
            "auto-generating recaps for %d cameras (%s)",
            len(camera_names),
            start.strftime("%Y-%m-%d"),
        )

        for camera in camera_names:
            if camera not in self.config.cameras:
                logger.warning("recap: camera %s not found, skipping", camera)
                continue

            export_id = (
                f"{camera}_recap_"
                f"{''.join(random.choices(string.ascii_lowercase + string.digits, k=6))}"
            )

            generator = RecapGenerator(
                config=self.config,
                export_id=export_id,
                camera=camera,
                start_time=start.timestamp(),
                end_time=end.timestamp(),
                label=recap_cfg.default_label,
            )
            generator.start()

            logger.info("recap started for %s (export_id=%s)", camera, export_id)
