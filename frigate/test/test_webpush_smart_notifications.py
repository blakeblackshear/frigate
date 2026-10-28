"""Tests for GenAI review notification threat level filtering."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from pydantic import ValidationError

from frigate.comms.webpush import WebPushClient
from frigate.config.camera.notification import NotificationConfig
from frigate.config.camera.review import (
    GenAIReviewConfig,
    ReviewThreatLevelEnum,
)


class TestWebPushSmartNotifications(unittest.TestCase):
    def _create_client(
        self,
        cooldown: int = 0,
        notification_threat_level: ReviewThreatLevelEnum | int | str | None = None,
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
        client.check_registrations = MagicMock()
        client.cleanup_registrations = MagicMock()
        client.send_push_notification = MagicMock()
        return client

    def _make_payload(
        self,
        event_type: str = "new",
        review_id: str = "rev_123",
        severity: str = "alert",
        potential_threat_level: int | str | None = 0,
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

    def test_default_behavior_sends_immediate_alert(self):
        """Verify default behavior sends push notification on new alert without delay."""
        client = self._create_client()
        new_payload = self._make_payload(event_type="new", review_id="rev_1")
        client.send_alert(new_payload)
        self.assertEqual(client.send_push_notification.call_count, 1)

    def test_notification_threat_level_defers_and_filters_lower_threat(self):
        """Verify notification_threat_level defers unevaluated alerts and filters low threat."""
        client = self._create_client(
            notification_threat_level=ReviewThreatLevelEnum.needs_review,
            genai_enabled=True,
            genai_alerts=True,
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
        last_call_kwargs = client.send_push_notification.call_args.kwargs
        self.assertIn("Needs Review: Suspicious activity", last_call_kwargs["title"])

    def test_notification_threat_level_allows_critical_threat(self):
        """Verify notifications configured with security_concern only trigger on critical threats."""
        client = self._create_client(
            notification_threat_level=ReviewThreatLevelEnum.security_concern,
            genai_enabled=True,
            genai_alerts=True,
        )
        # Threat level 1 should be suppressed when threshold is security_concern (2)
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
        """Verify alerts are not sent unassessed when GenAI review is disabled."""
        client = self._create_client(
            notification_threat_level=ReviewThreatLevelEnum.needs_review,
            genai_enabled=False,
        )
        start_payload = self._make_payload(event_type="new", review_id="rev_1")
        client.send_alert(start_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

        end_payload = self._make_payload(event_type="end", review_id="rev_1")
        client.send_alert(end_payload)
        self.assertEqual(client.send_push_notification.call_count, 0)

    def test_invalid_threat_scores_handled_safely(self):
        """Verify null or non-numeric threat scores do not throw exceptions."""
        client = self._create_client(
            notification_threat_level=ReviewThreatLevelEnum.needs_review,
            genai_enabled=True,
            genai_alerts=True,
        )
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

    def test_string_threat_level_normalizes_for_title_prefix(self):
        """Verify string threat levels correctly produce title prefix."""
        client = self._create_client(
            notification_threat_level=ReviewThreatLevelEnum.needs_review,
            genai_enabled=True,
            genai_alerts=True,
        )
        genai_payload = self._make_payload(
            event_type="genai",
            review_id="rev_str",
            potential_threat_level="1",
            title="Unfamiliar visitor",
        )
        client.send_alert(genai_payload)
        self.assertEqual(client.send_push_notification.call_count, 1)
        self.assertIn(
            "Needs Review: Unfamiliar visitor",
            client.send_push_notification.call_args.kwargs["title"],
        )

    def test_genai_review_config_validation(self):
        """Verify validation and type coercion for GenAIReviewConfig notification_threat_level."""
        # Valid threat levels via enum
        config_enum = GenAIReviewConfig(
            notification_threat_level=ReviewThreatLevelEnum.needs_review
        )
        self.assertEqual(
            config_enum.notification_threat_level,
            ReviewThreatLevelEnum.needs_review,
        )

        # Valid threat levels via string
        config_str = GenAIReviewConfig(notification_threat_level="security_concern")
        self.assertEqual(
            config_str.notification_threat_level,
            ReviewThreatLevelEnum.security_concern,
        )

        # Backward-compatible integer coercion
        config_int0 = GenAIReviewConfig(notification_threat_level=0)
        self.assertEqual(
            config_int0.notification_threat_level,
            ReviewThreatLevelEnum.normal,
        )

        config_int1 = GenAIReviewConfig(notification_threat_level=1)
        self.assertEqual(
            config_int1.notification_threat_level,
            ReviewThreatLevelEnum.needs_review,
        )

        config_int2 = GenAIReviewConfig(notification_threat_level=2)
        self.assertEqual(
            config_int2.notification_threat_level,
            ReviewThreatLevelEnum.security_concern,
        )

        config_none = GenAIReviewConfig(notification_threat_level=None)
        self.assertIsNone(config_none.notification_threat_level)

        # Out-of-range or invalid threat levels rejected
        with self.assertRaises(ValidationError):
            GenAIReviewConfig(notification_threat_level=3)

        with self.assertRaises(ValidationError):
            GenAIReviewConfig(notification_threat_level=-1)

        with self.assertRaises(ValidationError):
            GenAIReviewConfig(notification_threat_level="invalid_level")
