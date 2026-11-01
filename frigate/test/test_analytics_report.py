"""Tests for building a report from the collectors."""

import json
import logging
import os
import unittest
from unittest.mock import Mock, patch

from peewee import SqliteDatabase
from peewee_migrate import Router
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.analytics import report
from frigate.analytics.collectors import hardware
from frigate.analytics.schema import AnalyticsReport, InstallSection
from frigate.analytics.state import AnalyticsState
from frigate.models import User
from frigate.test.analytics_helpers import make_context
from frigate.test.const import TEST_DB, TEST_DB_CLEANUPS

INSTALL = InstallSection(
    version="0.19.0",
    image_variant="dev",
    install_type="docker",
    arch="x86_64",
    kernel="6.8",
    run_as_root=False,
)


class TestBuildReport(unittest.TestCase):
    def test_a_failing_collector_nulls_only_its_section(self):
        collectors = {
            "install": lambda ctx: INSTALL,
            "hardware": Mock(side_effect=RuntimeError("boom")),
            "detection": lambda ctx: None,
            "cameras": lambda ctx: None,
            "features": lambda ctx: None,
            "health": lambda ctx: None,
        }

        with patch.dict(report.COLLECTORS, collectors):
            built = report.build_report(make_context(), "a" * 32, sent_at=1790000000)

        self.assertEqual(built.install, INSTALL)
        self.assertIsNone(built.hardware)
        self.assertEqual(built.schema_version, 1)
        self.assertEqual(built.sent_at, 1790000000)
        self.assertRegex(built.report_id, r"^[0-9a-f-]{36}$")


class TestRealCollectors(unittest.TestCase):
    def setUp(self):
        migrate_db = SqliteDatabase(TEST_DB)
        del logging.getLogger("peewee_migrate").handlers[:]
        Router(migrate_db).run()
        migrate_db.close()
        self.db = SqliteQueueDatabase(TEST_DB)
        self.db.bind([User])

    def tearDown(self):
        # close() leaves the queue's writer thread running against the deleted file
        self.db.stop()

        if not self.db.is_closed():
            self.db.close()

        for file in TEST_DB_CLEANUPS:
            try:
                os.remove(file)
            except OSError:
                pass

    def test_every_section_builds_and_round_trips_through_json(self):
        with (
            patch.object(hardware.hardware_prober, "probe", return_value=[]),
            patch.object(hardware, "hwaccel_options", return_value=("", [])),
        ):
            built = report.build_report(make_context(), "a" * 32)

        body = built.model_dump_json()
        parsed = json.loads(body)

        for section in (
            "install",
            "hardware",
            "detection",
            "cameras",
            "features",
            "health",
        ):
            with self.subTest(section=section):
                self.assertIsNotNone(parsed[section])

        self.assertEqual(AnalyticsReport.model_validate_json(body), built)

    def test_preview_uses_a_placeholder_id_before_the_first_report(self):
        stats_emitter = Mock()
        stats_emitter.get_latest_stats.return_value = {}

        with (
            patch.object(report, "load_state", return_value=None),
            patch.object(hardware.hardware_prober, "probe", return_value=[]),
            patch.object(hardware, "hwaccel_options", return_value=("", [])),
        ):
            built = report.preview_report(make_context().config, stats_emitter, None)

        self.assertEqual(built.install_id, report.PREVIEW_INSTALL_ID)

    def test_preview_counts_notices_only_once_opted_in(self):
        stats_emitter = Mock()
        stats_emitter.get_latest_stats.return_value = {}
        registry = Mock()
        registry.stats.return_value = [
            {
                "kind": "detector_stuck",
                "occurrences": 3,
                "acknowledgements": 0,
                "mutes": 0,
                "reported_occurrences": 1,
                "reported_acknowledgements": 0,
                "reported_mutes": 0,
            }
        ]

        for state, expected in (
            (None, {}),
            (AnalyticsState("a" * 32, 0.0), {"detector_stuck": 2}),
        ):
            with (
                self.subTest(opted_in=state is not None),
                patch.object(report, "load_state", return_value=state),
                patch.object(hardware.hardware_prober, "probe", return_value=[]),
                patch.object(hardware, "hwaccel_options", return_value=("", [])),
            ):
                built = report.preview_report(
                    make_context().config, stats_emitter, registry
                )

            self.assertEqual(
                {kind: c.occurrences for kind, c in built.health.notices.items()},
                expected,
            )
