"""Tests for smart GenAI notification filtering and threat level controls."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from pydantic import ValidationError

from frigate.comms.webpush import WebPushClient
from frigate.config.camera.notification import NotificationConfig


class TestWebPushSmartNotifications(unittest.TestCase):
    def _create_client(
        self,
        cooldown: int = 0,
        notify_on: list[str] | None = None,
        min_threat_level: int | None = None,
        genai_enabled: bool = True,
        genai_alerts: bool = True,
    ) -> WebPushClient:
        client = WebPushClient.__new__(WebPushClient)
        notification_config = NotificationConfig(
            enabled=True,
            cooldown=cooldown,
            notify_on=notify_on if notify_on is not None else ["start", "genai"],
            min_threat_level=min_threat_level,
        )
        camera_config = SimpleNamespace(
            friendly_name="Front Porch",
            notifications=notification_config,
            zones={},
            review=SimpleNamespace(
                genai=SimpleNamespace(enabled=genai_enabled, alerts=genai_alerts)
            ),
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
        client.notified_review_ids = {"front_porch": ""}
        client.check_registrations = MagicMock()
        client.cleanup_registrations = MagicMock()
        client.send_push_notification = MagicMock()
        return client

    def _make_payload(
        self,
        event_type: str = "start",
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

    def test_default_settings_send_on_new_and_genai(self):
        client = self._create_client()
        # "new" is what Frigate review producer actually emits
        new_payload = self._make_payload(event_type="new", review_id="rev_1")
        client.send_alert(new_payload)
        self.assertEqual(client.send_push_notification.call_count, 1)

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

    def test_alert_promotion_from_detection_triggers_start_notification(self):
        client = self._create_client()
        promotion_payload = {
            "type": "update",
            "before": {
                "severity": "detection",
                "camera": "front_porch",
                "data": {"objects": ["person"], "zones": []},
            },
            "after": {
                "id": "rev_promo",
                "severity": "alert",
                "camera": "front_porch",
                "thumb_path": "/media/frigate/clips/thumb.jpg",
                "data": {
                    "objects": ["person"],
                    "sub_labels": [],
                    "zones": ["porch_zone"],
                    "metadata": {},
                },
            },
        }
        client.send_alert(promotion_payload)
        self.assertEqual(client.send_push_notification.call_count, 1)

    def test_min_threat_level_defers_all_unevaluated_states(self):
        client = self._create_client(min_threat_level=1, genai_enabled=True)
        # All unevaluated states (new, update, end) must be deferred until GenAI evaluation
        new_payload = self._make_payload(event_type="new", review_id="rev_1")
        client.send_alert(new_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

        update_payload = self._make_payload(event_type="update", review_id="rev_1")
        # Ensure update has a new object so it wouldn't be skipped by the deduplication check
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

    def test_invalid_threat_scores_handled_safely(self):
        client = self._create_client(min_threat_level=1, genai_enabled=True)
        # null or non-numeric threat score must not throw TypeError
        genai_payload = self._make_payload(
            event_type="genai",
            review_id="rev_null",
            title="Unknown assessment",
        )
        genai_payload["after"]["data"]["metadata"]["potential_threat_level"] = None
        client.send_alert(genai_payload)
        # Treated as threat_level = 0, below min_threat_level 1
        self.assertEqual(client.send_push_notification.call_count, 0)

        genai_payload["after"]["data"]["metadata"]["potential_threat_level"] = "invalid"
        client.send_alert(genai_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

    def test_cooldown_allows_genai_update_for_same_review(self):
        client = self._create_client(cooldown=60)
        start_payload = self._make_payload(event_type="start", review_id="rev_1")
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
        different_payload = self._make_payload(event_type="start", review_id="rev_2")
        client.send_alert(different_payload)
        self.assertEqual(client.send_push_notification.call_count, 2)

    def test_notify_on_genai_only_suppresses_start(self):
        client = self._create_client(notify_on=["genai"])
        start_payload = self._make_payload(event_type="start", review_id="rev_1")
        client.send_alert(start_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

        genai_payload = self._make_payload(
            event_type="genai",
            review_id="rev_1",
            title="Delivery completed",
        )
        client.send_alert(genai_payload)
        self.assertEqual(client.send_push_notification.call_count, 1)

    def test_notify_on_genai_fallback_on_end_when_genai_disabled(self):
        client = self._create_client(notify_on=["genai"], genai_enabled=False)
        start_payload = self._make_payload(event_type="start", review_id="rev_1")
        client.send_alert(start_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

        end_payload = self._make_payload(event_type="end", review_id="rev_1")
        client.send_alert(end_payload)
        self.assertEqual(client.send_push_notification.call_count, 1)

    def test_min_threat_level_suppresses_lower_threat(self):
        client = self._create_client(min_threat_level=1, genai_enabled=True)
        # Start notification is deferred awaiting GenAI threat assessment
        start_payload = self._make_payload(event_type="start", review_id="rev_1")
        client.send_alert(start_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

        # Threat level 0 (Normal) should be suppressed
        genai_payload = self._make_payload(
            event_type="genai",
            review_id="rev_1",
            potential_threat_level=0,
            title="Dog walking by",
        )
        client.send_alert(genai_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

    def test_min_threat_level_allows_matching_or_higher_threat(self):
        client = self._create_client(min_threat_level=1, genai_enabled=True)
        # Level 1 (Suspicious) is delivered
        genai_payload_1 = self._make_payload(
            event_type="genai",
            review_id="rev_1",
            potential_threat_level=1,
            title="Checking window handles",
        )
        client.send_alert(genai_payload_1)
        self.assertEqual(client.send_push_notification.call_count, 1)
        self.assertIn(
            "Needs Review: Checking window handles",
            client.send_push_notification.call_args.kwargs["title"],
        )

        # Level 2 (Critical Security Concern) is delivered
        genai_payload_2 = self._make_payload(
            event_type="genai",
            review_id="rev_2",
            potential_threat_level=2,
            title="Crowbar visible at door",
        )
        client.send_alert(genai_payload_2)
        self.assertEqual(client.send_push_notification.call_count, 2)
        self.assertIn(
            "Security Concern: Crowbar visible at door",
            client.send_push_notification.call_args.kwargs["title"],
        )

    def test_notification_config_validation(self):
        # Valid notify_on configurations
        config1 = NotificationConfig(notify_on=["start", "genai"])
        self.assertEqual(config1.notify_on, ["start", "genai"])

        # "new" and "update" are also valid triggers
        config_triggers = NotificationConfig(notify_on=["new", "update", "end"])
        self.assertEqual(config_triggers.notify_on, ["new", "update", "end"])

        # Comma-separated string coerced into list
        config2 = NotificationConfig(notify_on="start, end")
        self.assertEqual(config2.notify_on, ["start", "end"])

        # Invalid trigger name rejected
        with self.assertRaises(ValueError):
            NotificationConfig(notify_on=["invalid_trigger"])

        # Non-string list items safely rejected with ValueError (not TypeError)
        with self.assertRaises(ValueError):
            NotificationConfig(notify_on=[1])

        with self.assertRaises(ValueError):
            NotificationConfig(notify_on=[["nested"]])

        # Valid threat levels
        config3 = NotificationConfig(min_threat_level=2)
        self.assertEqual(config3.min_threat_level, 2)

        # Out-of-range threat levels rejected
        with self.assertRaises(ValidationError):
            NotificationConfig(min_threat_level=3)

        with self.assertRaises(ValidationError):
            NotificationConfig(min_threat_level=-1)
