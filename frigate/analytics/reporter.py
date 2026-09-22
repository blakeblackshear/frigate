"""Send one analytics report a day while the admin has opted in."""

import logging
import random
import threading
import time
from collections.abc import Callable
from multiprocessing.synchronize import Event as MpEvent
from typing import TYPE_CHECKING

from frigate.analytics.context import ReportContext
from frigate.analytics.report import build_report
from frigate.analytics.state import (
    STATE_PATH,
    AnalyticsState,
    delete_state,
    load_state,
    new_state,
    save_state,
)
from frigate.analytics.transport import SendOutcome, send_report
from frigate.config.holder import ConfigHolder
from frigate.const import ANALYTICS_URL
from frigate.notices import raise_notice, resolve_notice

if TYPE_CHECKING:
    from frigate.notices.registry import NoticeRegistry
    from frigate.stats.emitter import StatsEmitter

logger = logging.getLogger(__name__)

WAKE_S = 10 * 60
INTERVAL_S = 24 * 60 * 60
JITTER_S = 60 * 60
FIRST_DELAY_S = (15 * 60, 45 * 60)
PROMPT_KIND = "analytics_prompt"


class AnalyticsReporter(threading.Thread):
    """Reads the live config on every wake, so a settings save needs no restart."""

    def __init__(
        self,
        config_holder: ConfigHolder,
        stats_emitter: "StatsEmitter",
        notice_registry: "NoticeRegistry",
        stop_event: MpEvent | threading.Event,
        *,
        state_path: str = STATE_PATH,
        url: str = ANALYTICS_URL,
        send: Callable[[str, str], SendOutcome] = send_report,
        clock: Callable[[], float] = time.time,
        rng: random.Random | None = None,
    ) -> None:
        super().__init__(name="analytics_reporter", daemon=True)
        self.config_holder = config_holder
        self.stats_emitter = stats_emitter
        self.notice_registry = notice_registry
        self.stop_event = stop_event
        self.state_path = state_path
        self.url = url
        self.send = send
        self.clock = clock
        self.rng = rng or random.Random()
        self.first_due = clock() + self.rng.uniform(*FIRST_DELAY_S)
        self.interval = self._next_interval()
        self.opted_in: bool | None = None
        self.warned_unwritable = False

    def _next_interval(self) -> float:
        return INTERVAL_S + self.rng.uniform(-JITTER_S, JITTER_S)

    def run(self) -> None:
        while True:
            try:
                self.tick()
            except Exception:
                logger.exception("Analytics reporter failed")

            if self.stop_event.wait(WAKE_S):
                break

    def tick(self) -> None:
        config = self.config_holder.config

        # safe mode parses a default config where analytics reads as off, and
        # handling that as an opt-out would delete the install ID
        if config.safe_mode:
            return

        opted_in = config.telemetry.analytics

        if opted_in != self.opted_in:
            self.opted_in = opted_in

            if opted_in:
                resolve_notice(PROMPT_KIND)
            else:
                raise_notice(PROMPT_KIND)
                delete_state(self.state_path)

        if not opted_in:
            return

        now = self.clock()

        if now < self.first_due:
            return

        state = load_state(self.state_path) or new_state()

        if not self._due(state.last_attempt_at, now):
            return

        # saved before sending, so a failing endpoint or a crash mid-send still
        # waits a full interval; without saved state every boot would send
        # under a new install ID
        if not save_state(AnalyticsState(state.install_id, now), self.state_path):
            if not self.warned_unwritable:
                logger.warning(
                    "Analytics is on, but %s can't be written, so no report is sent",
                    self.state_path,
                )
                self.warned_unwritable = True

            return

        self.interval = self._next_interval()
        self._send(state.install_id, now)

    def _due(self, last_attempt_at: float, now: float) -> bool:
        # a last attempt stamped in the future came from a wrong clock
        return (
            now >= last_attempt_at + self.interval or last_attempt_at > now + INTERVAL_S
        )

    def _send(self, install_id: str, now: float) -> None:
        notice_stats = self.notice_registry.stats()
        ctx = ReportContext(
            config=self.config_holder.config,
            stats=self.stats_emitter.get_latest_stats(),
            notice_stats=notice_stats,
        )
        body = build_report(ctx, install_id, sent_at=int(now)).model_dump_json()

        if self.send(self.url, body) is SendOutcome.accepted:
            self.notice_registry.mark_reported(notice_stats)
            logger.info("Sent the daily analytics report")
            logger.debug("Analytics report: %s", body)
