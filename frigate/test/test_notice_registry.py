"""Tests for the notice registry and its kind definitions."""

import logging
import os
import unittest
from unittest.mock import MagicMock

from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.models import Notice, NoticeStats
from frigate.notices.registry import DismissResult, NoticeRegistry
from frigate.notices.types import (
    NOTICE_KINDS,
    NoticeMode,
    NoticeSeverity,
    notice_id,
)
from frigate.test.const import TEST_DB, TEST_DB_CLEANUPS


class TestNoticeKinds(unittest.TestCase):
    def test_every_kind_is_keyed_by_its_own_key(self):
        for key, definition in NOTICE_KINDS.items():
            self.assertEqual(key, definition.key)

    def test_first_producers_are_defined(self):
        self.assertEqual(NOTICE_KINDS["ffmpeg_crash_loop"].mode, NoticeMode.state)
        self.assertEqual(
            NOTICE_KINDS["ffmpeg_crash_loop"].severity, NoticeSeverity.error
        )
        self.assertEqual(NOTICE_KINDS["detector_stuck"].mode, NoticeMode.event)
        self.assertEqual(
            NOTICE_KINDS["detector_stuck"].severity, NoticeSeverity.warning
        )
        self.assertEqual(NOTICE_KINDS["model_download_failed"].mode, NoticeMode.event)
        self.assertEqual(NOTICE_KINDS["retention_unmet"].mode, NoticeMode.state)
        self.assertEqual(NOTICE_KINDS["update_available"].mode, NoticeMode.state)
        self.assertEqual(NOTICE_KINDS["update_available"].severity, NoticeSeverity.info)

    def test_notice_id_with_and_without_scope(self):
        self.assertEqual(notice_id("retention_unmet", None), "retention_unmet")
        self.assertEqual(
            notice_id("ffmpeg_crash_loop", "front_door"),
            "ffmpeg_crash_loop:front_door",
        )


class TestNoticeRegistry(unittest.TestCase):
    def setUp(self):
        migrate_db = SqliteExtDatabase("test.db")
        del logging.getLogger("peewee_migrate").handlers[:]
        router = Router(migrate_db)
        router.run()
        migrate_db.close()
        self.db = SqliteQueueDatabase(TEST_DB)
        self.db.bind([Notice, NoticeStats])
        self.registry = NoticeRegistry()
        self.listener = MagicMock()
        self.registry.subscribe(self.listener)

    def tearDown(self):
        if not self.db.is_closed():
            self.db.close()

        try:
            for file in TEST_DB_CLEANUPS:
                os.remove(file)
        except OSError:
            pass

    def test_raise_inserts_and_counts_one_occurrence(self):
        self.registry.raise_notice(
            "ffmpeg_crash_loop", scope="front_door", params={"restarts": 5}
        )

        active = self.registry.active()
        self.assertEqual(len(active), 1)
        self.assertEqual(active[0]["id"], "ffmpeg_crash_loop:front_door")
        self.assertEqual(active[0]["severity"], "error")
        self.assertEqual(active[0]["mode"], "state")
        self.assertEqual(active[0]["category"], "camera")
        self.assertEqual(active[0]["scope"], "front_door")
        self.assertEqual(active[0]["params"], {"restarts": 5})
        self.assertEqual(active[0]["count"], 1)
        self.assertEqual(self.registry.stats()[0]["occurrences"], 1)
        self.listener.assert_called_once()

    def test_state_re_raise_with_new_params_updates_without_counting(self):
        self.registry.raise_notice(
            "ffmpeg_crash_loop", scope="front_door", params={"restarts": 5}
        )
        self.listener.reset_mock()

        self.registry.raise_notice(
            "ffmpeg_crash_loop", scope="front_door", params={"restarts": 6}
        )

        active = self.registry.active()
        self.assertEqual(active[0]["count"], 1)
        self.assertEqual(active[0]["params"], {"restarts": 6})
        self.assertEqual(self.registry.stats()[0]["occurrences"], 1)
        self.listener.assert_called_once()

    def test_state_re_raise_with_same_params_is_a_no_op(self):
        self.registry.raise_notice(
            "ffmpeg_crash_loop", scope="front_door", params={"restarts": 5}
        )
        before = self.registry.active()[0]["last_seen"]
        self.listener.reset_mock()

        self.registry.raise_notice(
            "ffmpeg_crash_loop", scope="front_door", params={"restarts": 5}
        )

        self.assertEqual(self.registry.active()[0]["last_seen"], before)
        self.listener.assert_not_called()

    def test_event_re_raise_counts_and_undismisses(self):
        self.registry.raise_notice("detector_stuck", params={"detector": "ov"})
        self.assertEqual(self.registry.dismiss("detector_stuck"), DismissResult.ok)
        self.assertEqual(self.registry.active(), [])

        self.registry.raise_notice("detector_stuck", params={"detector": "ov"})
        # no scope here on purpose: a global event id is still valid

        active = self.registry.active()
        self.assertEqual(len(active), 1)
        self.assertEqual(active[0]["count"], 2)
        self.assertIsNone(active[0]["dismissed_at"])
        stats = self.registry.stats()[0]
        self.assertEqual(stats["occurrences"], 2)
        self.assertEqual(stats["dismissals"], 1)

    def test_resolve_deletes_and_keeps_stats(self):
        self.registry.raise_notice("retention_unmet", params={"needed_mb": 1})
        self.listener.reset_mock()

        self.registry.resolve("retention_unmet")
        self.registry.resolve("retention_unmet")

        self.assertEqual(self.registry.active(), [])
        self.assertEqual(self.registry.stats()[0]["occurrences"], 1)
        self.listener.assert_called_once()

    def test_state_notice_cannot_be_dismissed(self):
        self.registry.raise_notice("retention_unmet", params={})

        self.assertEqual(
            self.registry.dismiss("retention_unmet"), DismissResult.not_dismissable
        )
        self.assertEqual(len(self.registry.active()), 1)

    def test_dismiss_unknown_id(self):
        self.assertEqual(self.registry.dismiss("nope"), DismissResult.not_found)

    def test_dismissed_hidden_unless_requested(self):
        self.registry.raise_notice("detector_stuck", params={"detector": "ov"})
        self.registry.dismiss("detector_stuck")

        self.assertEqual(self.registry.active(), [])
        self.assertEqual(len(self.registry.active(include_dismissed=True)), 1)

    def test_startup_hides_state_notices_until_confirmed(self):
        self.registry.raise_notice("retention_unmet", params={"needed_mb": 1})
        self.registry.raise_notice(
            "detector_stuck", scope="ov", params={"detector": "ov"}
        )

        self.registry.mark_state_notices_unconfirmed()

        ids = [n["id"] for n in self.registry.active()]
        self.assertEqual(ids, ["detector_stuck:ov"])

        # the producer confirms the same episode: visible again, no new occurrence
        self.registry.raise_notice("retention_unmet", params={"needed_mb": 1})

        ids = [n["id"] for n in self.registry.active()]
        self.assertEqual(ids, ["retention_unmet", "detector_stuck:ov"])
        self.assertEqual(
            [s for s in self.registry.stats() if s["kind"] == "retention_unmet"][0][
                "occurrences"
            ],
            1,
        )

    def test_unconfirmed_across_two_startups_is_deleted(self):
        self.registry.raise_notice("retention_unmet", params={})

        self.registry.mark_state_notices_unconfirmed()
        self.registry.mark_state_notices_unconfirmed()

        self.assertEqual(self.registry.active(include_dismissed=True), [])

    def test_replay_camera_is_ignored(self):
        self.registry.raise_notice(
            "ffmpeg_crash_loop", scope="_replay_front_door", params={}
        )

        self.assertEqual(self.registry.active(), [])
        self.assertEqual(self.registry.stats(), [])

    def test_unknown_kind_is_dropped(self):
        self.registry.raise_notice("not_a_kind", params={})

        self.assertEqual(self.registry.active(), [])
        self.listener.assert_not_called()

    def test_active_sorts_by_severity_then_recency(self):
        self.registry.raise_notice("detector_stuck", params={"detector": "ov"})
        self.registry.raise_notice("retention_unmet", params={})

        ids = [n["id"] for n in self.registry.active()]
        self.assertEqual(ids, ["retention_unmet", "detector_stuck"])

    def test_listener_exception_does_not_propagate(self):
        self.registry.subscribe(MagicMock(side_effect=RuntimeError("boom")))

        self.registry.raise_notice("retention_unmet", params={})

        self.assertEqual(len(self.registry.active()), 1)

    def test_resolve_camera_drops_only_that_camera(self):
        self.registry.raise_notice("ffmpeg_crash_loop", scope="front_door", params={})
        self.registry.raise_notice("ffmpeg_crash_loop", scope="garage", params={})
        self.registry.raise_notice(
            "model_download_failed", scope="front_door", params={}
        )

        self.registry.resolve_camera("front_door")

        ids = sorted(n["id"] for n in self.registry.active())
        self.assertEqual(
            ids, ["ffmpeg_crash_loop:garage", "model_download_failed:front_door"]
        )
