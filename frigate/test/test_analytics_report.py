"""Tests for building a report from the collectors."""

import json
import logging
import os
import unittest
from unittest.mock import Mock, patch

from peewee_migrate import Router
from playhouse.sqlite_ext import SqliteExtDatabase
from playhouse.sqliteq import SqliteQueueDatabase

from frigate.analytics import report
from frigate.analytics.collectors import hardware
from frigate.analytics.schema import AnalyticsReport, InstallSection
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
        migrate_db = SqliteExtDatabase(TEST_DB)
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
