"""Tests for expired push subscription cleanup."""

import threading
import unittest
from unittest.mock import patch

from peewee import SqliteDatabase

from frigate.comms.webpush import WebPushClient
from frigate.models import User

LIVE = {"endpoint": "https://push.example.com/live", "keys": {}}
DEAD = {"endpoint": "https://push.example.com/dead", "keys": {}}


class TestCleanupRegistrations(unittest.TestCase):
    def setUp(self):
        self.db = SqliteDatabase(":memory:")
        self.enterContext(self.db.bind_ctx([User]))
        self.db.create_tables([User])

        User.create(
            username="alice", password_hash="x", notification_tokens=[LIVE, DEAD]
        )

        self.client = WebPushClient.__new__(WebPushClient)
        self.client.web_pushers = {}
        self.client.expired_subs = {}
        self.client.expired_subs_lock = threading.Lock()
        self.client.cleanup_lock = threading.Lock()

    def tearDown(self):
        self.db.close()

    @patch("frigate.comms.webpush._build_web_pushers", return_value=[])
    def test_skips_deleted_user_and_prunes_the_rest(self, _build):
        self.client.expired_subs = {
            "deleted": ["https://push.example.com/gone"],
            "alice": [DEAD["endpoint"]],
        }

        self.client.cleanup_registrations()

        self.assertEqual(User.get_by_id("alice").notification_tokens, [LIVE])
        self.assertEqual(self.client.expired_subs, {})
        _build.assert_called_once_with("alice", [LIVE])

    @patch("frigate.comms.webpush._build_web_pushers", return_value=[])
    def test_keeps_malformed_tokens_and_prunes_expired(self, _build):
        malformed = [None, {"keys": {}}]
        User.update(notification_tokens=[LIVE, *malformed, DEAD]).execute()
        self.client.expired_subs = {"alice": [DEAD["endpoint"]]}

        self.client.cleanup_registrations()

        self.assertEqual(
            User.get_by_id("alice").notification_tokens, [LIVE, *malformed]
        )
