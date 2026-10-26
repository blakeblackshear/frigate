"""Tests for GenAI review notification threat level filtering and controls."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from pydantic import ValidationError

from frigate.comms.webpush import WebPushClient
from frigate.config.camera.notification import NotificationConfig
from frigate.config.camera.review import GenAIReviewConfig


class TestWebPushSmartNotifications(unittest.TestCase):
    def _create_client(
        self,
        cooldown: int = 0,
        notification_threat_level: int | None = None,
        genai_enabled: bool = True,
        genai_alerts: bool = True,
    ) -> WebPushClient:
        client = WebPushClient.__new__(WebPushClient)
        notification_config = NotificationConfig(
            enabled=True,
            cooldown=cooldown,
        )
        genai_config = GenAIReviewConfig(
            enabled=genai_enabled,
            alerts=genai_alerts,
            notification_threat_level=notification_threat_level,
        )
        camera_config = SimpleNamespace(
            friendly_name="Front Porch",
            notifications=notification_config,
            zones={},
            review=SimpleNamespace(genai=genai_config),
        )
        client.config = SimpleNamespace(
            notifications=SimpleNamespace(email="test@example.com", cooldown=0),
            cameras={"front_porch": camera_config},
        )
        client.web_pushers = {"user1": []}
        client.user_cameras = {"user1": {"front_porch"}}
        client.suspended_cameras = {"front_porch": 0}
        client.last_camera_notification_time = {"front_porch": 0.0}
        client.last_notification_time = 0.0
        client.notified_review_ids = {"front_porch": {}}
        client.check_registrations = MagicMock()
        client.cleanup_registrations = MagicMock()
        client.send_push_notification = MagicMock()
        return client

    def _make_payload(
        self,
        event_type: str = "new",
        review_id: str = "rev_123",
        severity: str = "alert",
        potential_threat_level: int = 0,
        title: str = "Person detected",
        summary: str = "A person walked by",
    ) -> dict:
        return {
            "type": event_type,
            "before": {
                "severity": severity,
                "camera": "front_porch",
                "data": {"objects": [], "zones": []},
            },
            "after": {
                "id": review_id,
                "severity": severity,
                "camera": "front_porch",
                "thumb_path": "/media/frigate/clips/thumb.jpg",
                "data": {
                    "objects": ["person"],
                    "sub_labels": [],
                    "zones": [],
                    "metadata": {
                        "title": title,
                        "shortSummary": summary,
                        "potential_threat_level": potential_threat_level,
                    },
                },
            },
        }

    def test_default_behavior_sends_immediate_alert_and_genai_update(self):
        client = self._create_client()
        # Default behavior sends on new alert immediately
        new_payload = self._make_payload(event_type="new", review_id="rev_1")
        client.send_alert(new_payload)
        self.assertEqual(client.send_push_notification.call_count, 1)

        # Later, GenAI finishes and enriches the alert
        genai_payload = self._make_payload(
            event_type="genai",
            review_id="rev_1",
            potential_threat_level=1,
            title="Person loitering",
        )
        client.send_alert(genai_payload)
        self.assertEqual(client.send_push_notification.call_count, 2)
        last_call_kwargs = client.send_push_notification.call_args.kwargs
        self.assertIn("Needs Review: Person loitering", last_call_kwargs["title"])

    def test_cooldown_allows_genai_update_for_same_review(self):
        client = self._create_client(cooldown=60)
        start_payload = self._make_payload(event_type="new", review_id="rev_1")
        client.send_alert(start_payload)
        self.assertEqual(client.send_push_notification.call_count, 1)

        # Same review sending genai update within cooldown window must not be blocked
        genai_payload = self._make_payload(
            event_type="genai",
            review_id="rev_1",
            potential_threat_level=0,
            title="Person left package",
        )
        client.send_alert(genai_payload)
        self.assertEqual(client.send_push_notification.call_count, 2)

        # Different review within cooldown window must be blocked
        different_payload = self._make_payload(event_type="new", review_id="rev_2")
        client.send_alert(different_payload)
        self.assertEqual(client.send_push_notification.call_count, 2)

    def test_slow_analysis_retains_cooldown_exemption_across_multiple_reviews(self):
        # Review A starts at t=0
        client = self._create_client(cooldown=60)
        client.last_notification_time = 0.0
        client.last_camera_notification_time["front_porch"] = 0.0

        payload_a_start = self._make_payload(event_type="new", review_id="rev_a")
        client.send_alert(payload_a_start)
        self.assertEqual(client.send_push_notification.call_count, 1)

        # Review B starts at t=61 (outside cooldown)
        client.last_notification_time = 0.0
        client.last_camera_notification_time["front_porch"] = 0.0
        payload_b_start = self._make_payload(event_type="new", review_id="rev_b")
        client.send_alert(payload_b_start)
        self.assertEqual(client.send_push_notification.call_count, 2)

        # Review A's slow GenAI analysis finishes while within cooldown from Review B
        # Review A must still be exempt from cooldown because it was already notified
        payload_a_genai = self._make_payload(
            event_type="genai",
            review_id="rev_a",
            potential_threat_level=1,
            title="Review A evaluated",
        )
        client.send_alert(payload_a_genai)
        self.assertEqual(client.send_push_notification.call_count, 3)
        last_call_kwargs = client.send_push_notification.call_args.kwargs
        self.assertIn("Needs Review: Review A evaluated", last_call_kwargs["title"])

    def test_notification_threat_level_defers_and_filters_lower_threat(self):
        client = self._create_client(
            notification_threat_level=1, genai_enabled=True, genai_alerts=True
        )
        # All unevaluated states (new, update, end) must be deferred until GenAI evaluation
        new_payload = self._make_payload(event_type="new", review_id="rev_1")
        client.send_alert(new_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

        update_payload = self._make_payload(event_type="update", review_id="rev_1")
        update_payload["after"]["data"]["objects"].append("car")
        client.send_alert(update_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

        end_payload = self._make_payload(event_type="end", review_id="rev_1")
        client.send_alert(end_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

        # GenAI analysis below threshold should be suppressed
        genai_low = self._make_payload(
            event_type="genai",
            review_id="rev_1",
            potential_threat_level=0,
            title="Normal activity",
        )
        client.send_alert(genai_low)
        self.assertEqual(client.send_push_notification.call_count, 0)

        # GenAI analysis meeting threshold triggers the notification
        genai_high = self._make_payload(
            event_type="genai",
            review_id="rev_1",
            potential_threat_level=1,
            title="Suspicious activity",
        )
        client.send_alert(genai_high)
        self.assertEqual(client.send_push_notification.call_count, 1)

    def test_notification_threat_level_allows_critical_threat(self):
        client = self._create_client(
            notification_threat_level=2, genai_enabled=True, genai_alerts=True
        )
        # Threat level 1 should be suppressed when threshold is 2
        genai_1 = self._make_payload(
            event_type="genai",
            review_id="rev_1",
            potential_threat_level=1,
            title="Checking window handles",
        )
        client.send_alert(genai_1)
        self.assertEqual(client.send_push_notification.call_count, 0)

        # Threat level 2 should be sent
        genai_2 = self._make_payload(
            event_type="genai",
            review_id="rev_2",
            potential_threat_level=2,
            title="Crowbar visible at door",
        )
        client.send_alert(genai_2)
        self.assertEqual(client.send_push_notification.call_count, 1)
        self.assertIn(
            "Security Concern: Crowbar visible at door",
            client.send_push_notification.call_args.kwargs["title"],
        )

    def test_notification_threat_level_suppresses_when_genai_disabled(self):
        # When notification_threat_level is set but GenAI is disabled, alerts lack threat assessment
        # and must not be sent unassessed.
        client = self._create_client(notification_threat_level=1, genai_enabled=False)
        start_payload = self._make_payload(event_type="new", review_id="rev_1")
        client.send_alert(start_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

        end_payload = self._make_payload(event_type="end", review_id="rev_1")
        client.send_alert(end_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

    def test_invalid_threat_scores_handled_safely(self):
        client = self._create_client(
            notification_threat_level=1, genai_enabled=True, genai_alerts=True
        )
        # null or non-numeric threat score must not throw TypeError
        genai_payload = self._make_payload(
            event_type="genai",
            review_id="rev_null",
            title="Unknown assessment",
        )
        genai_payload["after"]["data"]["metadata"]["potential_threat_level"] = None
        client.send_alert(genai_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

        genai_payload["after"]["data"]["metadata"]["potential_threat_level"] = "invalid"
        client.send_alert(genai_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

    def test_genai_review_config_validation(self):
        # Valid threat levels
        config1 = GenAIReviewConfig(notification_threat_level=1)
        self.assertEqual(config1.notification_threat_level, 1)

        config2 = GenAIReviewConfig(notification_threat_level=2)
        self.assertEqual(config2.notification_threat_level, 2)

        config_none = GenAIReviewConfig(notification_threat_level=None)
        self.assertIsNone(config_none.notification_threat_level)

        # Out-of-range threat levels rejected
        with self.assertRaises(ValidationError):
            GenAIReviewConfig(notification_threat_level=3)

        with self.assertRaises(ValidationError):
            GenAIReviewConfig(notification_threat_level=-1)
