"""Tests for the notice registry and its kind definitions."""

import logging
import os
import unittest
from unittest.mock import MagicMock, patch

from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.models import Notice, NoticeStats
from frigate.notices.registry import NoticeRegistry
from frigate.notices.types import NOTICE_KINDS, NoticeKind, NoticeSeverity, notice_id
from frigate.test.const import TEST_DB, TEST_DB_CLEANUPS

# kinds that switch on the lifecycle knobs, so the tests do not depend on the
# values the real catalog picks
BATCHED = NoticeKind("batched", NoticeSeverity.warning, "system", batch_repeats=True)
PRUNED = NoticeKind("pruned", NoticeSeverity.info, "system", keep_latest=2)
TEST_KINDS = {kind.key: kind for kind in (BATCHED, PRUNED)}


class TestNoticeKinds(unittest.TestCase):
    def test_every_kind_is_keyed_by_its_own_key(self):
        for key, definition in NOTICE_KINDS.items():
            self.assertEqual(key, definition.key)

    def test_notice_id_with_and_without_scope(self):
        self.assertEqual(notice_id("failed_login", None), "failed_login")
        self.assertEqual(
            notice_id("skipped_detections", "front_door"),
            "skipped_detections:front_door",
        )

    def test_link_is_filled_in_from_params(self):
        kind = NoticeKind(
            "k", NoticeSeverity.info, "system", link="https://x/v{version}"
        )

        self.assertEqual(kind.link_for({"version": "0.19.1"}), "https://x/v0.19.1")
        self.assertIsNone(kind.link_for({}))

    def test_a_kind_without_a_link(self):
        kind = NoticeKind("k", NoticeSeverity.info, "system")

        self.assertIsNone(kind.link_for({"version": "0.19.1"}))


class RegistryTestCase(unittest.TestCase):
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

    def _raise_at(self, timestamp: float, kind: str, **kwargs) -> None:
        with patch("frigate.notices.registry.datetime") as mock_datetime:
            mock_datetime.now.return_value.timestamp.return_value = timestamp
            self.registry.raise_notice(kind, **kwargs)


class TestNoticeRegistry(RegistryTestCase):
    def test_raise_inserts_and_counts_one_occurrence(self):
        self.registry.raise_notice(
            "skipped_detections", scope="front_door", params={"pct": 12.5}
        )

        active = self.registry.active()
        self.assertEqual(len(active), 1)
        self.assertEqual(active[0]["id"], "skipped_detections:front_door")
        self.assertEqual(active[0]["severity"], "warning")
        self.assertEqual(active[0]["category"], "camera")
        self.assertEqual(active[0]["params"], {"pct": 12.5})
        self.assertEqual(active[0]["link"], "/system#cameras")
        self.assertEqual(active[0]["count"], 1)
        self.assertEqual(self.registry.stats()[0]["occurrences"], 1)
        self.listener.assert_called_once()

    def test_re_raise_counts_and_updates_params(self):
        self.registry.raise_notice(
            "skipped_detections", scope="front_door", params={"pct": 12.5}
        )
        self.registry.raise_notice(
            "skipped_detections", scope="front_door", params={"pct": 8.0}
        )

        active = self.registry.active()
        self.assertEqual(active[0]["count"], 2)
        self.assertEqual(active[0]["params"], {"pct": 8.0})
        self.assertEqual(self.registry.stats()[0]["occurrences"], 2)

    def test_repeat_of_a_non_counting_kind_is_a_no_op(self):
        self.registry.raise_notice(
            "update_available", scope="0.19.1", params={"version": "0.19.1"}
        )
        self.listener.reset_mock()

        self.registry.raise_notice(
            "update_available", scope="0.19.1", params={"version": "0.19.1"}
        )

        self.assertEqual(self.registry.active()[0]["count"], 1)
        self.assertEqual(self.registry.stats()[0]["occurrences"], 1)
        self.listener.assert_not_called()

    def test_acknowledged_notice_returns_on_a_re_raise(self):
        self.registry.raise_notice("detector_stuck", scope="ov", params={})
        self.assertTrue(self.registry.acknowledge("detector_stuck:ov"))
        self.assertEqual(self.registry.active(), [])

        self.registry.raise_notice("detector_stuck", scope="ov", params={})

        notice = self.registry.active()[0]
        self.assertEqual(notice["count"], 2)
        self.assertIsNone(notice["acknowledged_at"])

    def test_muted_notice_stays_hidden_on_a_re_raise(self):
        self.registry.raise_notice("skipped_detections", scope="front_door", params={})
        self.assertTrue(self.registry.mute("skipped_detections:front_door"))

        self.registry.raise_notice("skipped_detections", scope="front_door", params={})

        self.assertEqual(self.registry.active(), [])
        hidden = self.registry.active(include_hidden=True)
        self.assertEqual(hidden[0]["count"], 2)
        self.assertIsNotNone(hidden[0]["muted_at"])

    def test_muting_an_acknowledged_notice_replaces_the_acknowledgement(self):
        self.registry.raise_notice("detector_stuck", scope="ov", params={})
        self.registry.acknowledge("detector_stuck:ov")

        self.assertTrue(self.registry.mute("detector_stuck:ov"))

        notice = self.registry.active(include_hidden=True)[0]
        self.assertIsNone(notice["acknowledged_at"])
        self.assertIsNotNone(notice["muted_at"])

    def test_acknowledging_a_muted_notice_keeps_it_muted(self):
        self.registry.raise_notice("detector_stuck", scope="ov", params={})
        self.registry.mute("detector_stuck:ov")

        self.assertTrue(self.registry.acknowledge("detector_stuck:ov"))

        notice = self.registry.active(include_hidden=True)[0]
        self.assertIsNone(notice["acknowledged_at"])
        self.assertIsNotNone(notice["muted_at"])

    def test_acknowledge_and_mute_each_count_once(self):
        self.registry.raise_notice("detector_stuck", scope="ov", params={})
        self.registry.raise_notice("shm_too_low", params={})

        self.assertTrue(self.registry.acknowledge("detector_stuck:ov"))
        self.assertTrue(self.registry.acknowledge("detector_stuck:ov"))
        self.assertTrue(self.registry.mute("shm_too_low"))
        self.assertTrue(self.registry.mute("shm_too_low"))

        stats = {s["kind"]: s for s in self.registry.stats()}
        self.assertEqual(stats["detector_stuck"]["acknowledgements"], 1)
        self.assertEqual(stats["detector_stuck"]["mutes"], 0)
        self.assertEqual(stats["shm_too_low"]["mutes"], 1)

    def test_unknown_ids_are_rejected(self):
        self.assertFalse(self.registry.acknowledge("nope"))
        self.assertFalse(self.registry.mute("nope"))
        self.assertFalse(self.registry.unhide("nope"))

    def test_kinds_that_never_repeat_cannot_be_acknowledged(self):
        self.registry.raise_notice(
            "update_available", scope="0.19.1", params={"version": "0.19.1"}
        )

        self.assertFalse(self.registry.acknowledge("update_available:0.19.1"))
        self.assertFalse(
            self.registry.acknowledge("config:detect:fps-greater-than-five:global")
        )
        self.assertEqual(self.registry.active()[0]["acknowledgeable"], False)

    def test_hidden_notices_listed_only_when_requested(self):
        self.registry.raise_notice("detector_stuck", scope="ov", params={})
        self.registry.acknowledge("detector_stuck:ov")

        self.assertEqual(self.registry.active(), [])
        self.assertEqual(len(self.registry.active(include_hidden=True)), 1)

    def test_unhide_shows_a_notice_and_drops_a_check_mute(self):
        self.registry.raise_notice("detector_stuck", scope="ov", params={})
        self.registry.mute("detector_stuck:ov")
        self.registry.mute("config:detect:fps-greater-than-five:global")

        self.assertTrue(self.registry.unhide("detector_stuck:ov"))
        self.assertTrue(
            self.registry.unhide("config:detect:fps-greater-than-five:global")
        )

        notice = self.registry.active()[0]
        self.assertIsNone(notice["muted_at"])
        self.assertEqual(self.registry.muted_checks(), [])

    def test_resolve_deletes_and_keeps_stats(self):
        self.registry.raise_notice(
            "model_download_failed", scope="yolo/model.onnx", params={}
        )
        self.listener.reset_mock()

        self.registry.resolve("model_download_failed", "yolo/model.onnx")
        self.registry.resolve("model_download_failed", "yolo/model.onnx")

        self.assertEqual(self.registry.active(include_hidden=True), [])
        self.assertEqual(self.registry.stats()[0]["occurrences"], 1)
        self.listener.assert_called_once()

    def test_resolve_kind_drops_every_scope_of_that_kind(self):
        self.registry.raise_notice("detector_stuck", params={})
        self.registry.raise_notice("detector_stuck", scope="ov", params={})
        self.registry.raise_notice("skipped_detections", scope="garage", params={})

        self.registry.resolve_kind("detector_stuck")

        ids = [n["id"] for n in self.registry.active()]
        self.assertEqual(ids, ["skipped_detections:garage"])

    def test_active_fills_in_each_link(self):
        self.registry.raise_notice(
            "update_available", scope="0.19.1", params={"version": "0.19.1"}
        )
        self.registry.raise_notice(
            "model_download_failed", scope="yolo/model.onnx", params={}
        )

        links = {n["kind"]: n["link"] for n in self.registry.active()}
        self.assertEqual(
            links,
            {
                "update_available": "https://github.com/blakeblackshear/frigate/releases/tag/v0.19.1",
                "model_download_failed": None,
            },
        )

    def test_replay_camera_is_ignored(self):
        self.registry.raise_notice(
            "skipped_detections", scope="_replay_front_door", params={}
        )

        self.assertEqual(self.registry.active(), [])
        self.assertEqual(self.registry.stats(), [])

    def test_unknown_kind_is_dropped(self):
        self.registry.raise_notice("not_a_kind", params={})

        self.assertEqual(self.registry.active(), [])
        self.listener.assert_not_called()

    def test_active_sorts_by_severity_then_recency(self):
        self.registry.raise_notice("detector_stuck", scope="ov", params={})
        self.registry.raise_notice(
            "model_download_failed", scope="yolo/model.onnx", params={}
        )

        ids = [n["id"] for n in self.registry.active()]
        self.assertEqual(
            ids, ["model_download_failed:yolo/model.onnx", "detector_stuck:ov"]
        )

    def test_listener_exception_does_not_propagate(self):
        self.registry.subscribe(MagicMock(side_effect=RuntimeError("boom")))

        self.registry.raise_notice("detector_stuck", scope="ov", params={})

        self.assertEqual(len(self.registry.active()), 1)

    def test_resolve_camera_drops_only_that_camera(self):
        self.registry.raise_notice("skipped_detections", scope="front_door", params={})
        self.registry.raise_notice("skipped_detections", scope="garage", params={})
        self.registry.raise_notice(
            "model_download_failed", scope="front_door", params={}
        )

        self.registry.resolve_camera("front_door")

        ids = sorted(n["id"] for n in self.registry.active())
        self.assertEqual(
            ids, ["model_download_failed:front_door", "skipped_detections:garage"]
        )

    def test_resolve_camera_drops_that_cameras_check_mutes(self):
        for check_id in (
            "stream:front_door:0:probe",
            "config:detect:fps-greater-than-five:camera.front_door",
            "config:detect:fps-greater-than-five:global",
            "stream:garage:0:probe",
        ):
            self.assertTrue(self.registry.mute(check_id))

        self.registry.resolve_camera("front_door")

        ids = sorted(check["id"] for check in self.registry.muted_checks())
        self.assertEqual(
            ids,
            ["config:detect:fps-greater-than-five:global", "stream:garage:0:probe"],
        )

    def test_camera_named_global_keeps_global_check_mutes(self):
        self.registry.mute("config:detect:fps-greater-than-five:global")
        self.registry.mute("config:detect:fps-greater-than-five:camera.global")

        self.registry.resolve_camera("global")

        ids = [check["id"] for check in self.registry.muted_checks()]
        self.assertEqual(ids, ["config:detect:fps-greater-than-five:global"])

    def test_unhide_all_shows_every_notice_and_keeps_counts(self):
        self.registry.raise_notice("detector_stuck", scope="ov", params={})
        self.registry.raise_notice("skipped_detections", scope="garage", params={})
        self.registry.acknowledge("detector_stuck:ov")
        self.registry.mute("skipped_detections:garage")
        self.registry.mute("config:detect:fps-greater-than-five:camera.garage")

        self.registry.unhide_all()

        ids = sorted(n["id"] for n in self.registry.active())
        self.assertEqual(ids, ["detector_stuck:ov", "skipped_detections:garage"])
        self.assertEqual(self.registry.muted_checks(), [])
        stats = {s["kind"]: s for s in self.registry.stats()}
        self.assertEqual(stats["detector_stuck"]["acknowledgements"], 1)
        self.assertEqual(stats["skipped_detections"]["mutes"], 1)


class TestApply(RegistryTestCase):
    def test_each_action_reaches_its_method(self):
        self.registry.apply(
            {
                "action": "raise",
                "kind": "detector_stuck",
                "scope": "ov",
                "params": {"detector": "ov"},
            }
        )
        self.assertEqual(
            [n["id"] for n in self.registry.active()], ["detector_stuck:ov"]
        )

        self.registry.apply(
            {"action": "resolve", "kind": "detector_stuck", "scope": "ov"}
        )
        self.assertEqual(self.registry.active(), [])

        for scope in ("a", "b"):
            self.registry.apply(
                {"action": "raise", "kind": "detector_stuck", "scope": scope}
            )
        self.registry.apply({"action": "resolve_kind", "kind": "detector_stuck"})
        self.assertEqual(self.registry.active(), [])

    def test_malformed_updates_are_logged_and_ignored(self):
        with self.assertLogs("frigate.notices.registry", level="WARNING") as logs:
            self.registry.apply({"action": "raise"})
            self.registry.apply({"action": "explode", "kind": "detector_stuck"})

        self.assertEqual(len(logs.output), 2)
        self.assertEqual(self.registry.active(), [])


@patch.dict(NOTICE_KINDS, TEST_KINDS)
class TestLifecycleKnobs(RegistryTestCase):
    def test_batched_repeats_wait_for_the_flush(self):
        self.registry.raise_notice("batched", params={"n": 1})
        self.listener.reset_mock()

        for n in (2, 3, 4):
            self.registry.raise_notice("batched", params={"n": n})

        self.assertEqual(self.registry.active()[0]["count"], 1)
        self.listener.assert_not_called()

        self.registry.flush()

        notice = self.registry.active()[0]
        self.assertEqual(notice["count"], 4)
        self.assertEqual(notice["params"], {"n": 4})
        self.assertEqual(self.registry.stats()[0]["occurrences"], 4)
        self.listener.assert_called_once()

    def test_flush_with_nothing_held_is_a_no_op(self):
        self.registry.raise_notice("batched")
        self.listener.reset_mock()

        self.registry.flush()

        self.listener.assert_not_called()

    def test_repeats_of_a_resolved_notice_are_dropped(self):
        self.registry.raise_notice("batched")
        self.registry.raise_notice("batched")
        self.registry.resolve("batched")
        self.listener.reset_mock()

        self.registry.flush()

        self.assertEqual(self.registry.active(include_hidden=True), [])
        self.listener.assert_not_called()

    def test_a_new_row_starts_without_stale_repeats(self):
        self.registry.raise_notice("batched")
        self.registry.raise_notice("batched")
        self.registry.resolve("batched")

        self.registry.raise_notice("batched")
        self.registry.flush()

        self.assertEqual(self.registry.active()[0]["count"], 1)

    def test_an_acknowledged_notice_returns_when_held_repeats_flush(self):
        self.registry.raise_notice("batched")
        self.registry.acknowledge("batched")

        self.registry.raise_notice("batched")
        self.assertEqual(self.registry.active(), [])

        self.registry.flush()

        self.assertEqual(self.registry.active()[0]["count"], 2)

    def test_keep_latest_drops_the_oldest_rows(self):
        for index, scope in enumerate(("a", "b", "c")):
            self._raise_at(1000.0 + index, "pruned", scope=scope)

        ids = sorted(n["id"] for n in self.registry.active())
        self.assertEqual(ids, ["pruned:b", "pruned:c"])


class TestCatalogLifecycles(RegistryTestCase):
    def test_a_new_release_replaces_the_old_update_notice(self):
        for index, version in enumerate(("0.19.0", "0.19.1")):
            self._raise_at(
                1000.0 + index,
                "update_available",
                scope=version,
                params={"version": version},
            )

        ids = [n["id"] for n in self.registry.active()]
        self.assertEqual(ids, ["update_available:0.19.1"])

    def test_an_acknowledged_failed_login_burst_returns_on_the_next_attempt(self):
        self.registry.raise_notice("failed_login", scope="1000")
        self.registry.acknowledge("failed_login:1000")

        self.registry.raise_notice("failed_login", scope="1000")
        self.registry.flush()

        burst = self.registry.active()[0]
        self.assertEqual(burst["count"], 2)
        self.assertIsNone(burst["acknowledged_at"])
