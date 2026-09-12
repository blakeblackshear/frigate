"""Tests for MQTT command topic callback registration."""

import unittest
from unittest.mock import MagicMock, patch

from frigate.comms.mqtt import MqttClient


def _make_camera_mock(
    *,
    enabled: bool = True,
    notifications_enabled_in_config: bool = False,
) -> MagicMock:
    """Build a camera config mock with the fields _start() reads."""
    camera = MagicMock()
    camera.enabled = enabled
    camera.notifications.enabled_in_config = notifications_enabled_in_config
    camera.onvif.host = None
    camera.motion.mask = {}
    camera.objects.mask = {}
    camera.zones = {}
    return camera


def _registered_topics(
    cameras: dict[str, MagicMock],
    *,
    global_notifications_enabled_in_config: bool = False,
) -> set[str]:
    """Start an MqttClient against a mocked paho client and collect the
    topics registered via message_callback_add."""
    config = MagicMock()
    config.cameras = cameras
    config.notifications.enabled_in_config = global_notifications_enabled_in_config
    config.mqtt.topic_prefix = "frigate"
    config.mqtt.client_id = "frigate"
    config.mqtt.user = None
    config.mqtt.tls_ca_certs = None
    config.mqtt.tls_insecure = None

    with patch("frigate.comms.mqtt.mqtt.Client") as client_cls:
        mqtt_client = MqttClient(config)
        mqtt_client.subscribe(MagicMock())

    paho_client = client_cls.return_value
    return {call.args[0] for call in paho_client.message_callback_add.call_args_list}


class TestMqttTopicRegistration(unittest.TestCase):
    def test_camera_notification_topics_registered(self):
        """Per-camera notification set/suspend must be registered so paho
        routes them to the dispatcher (unregistered topics drop silently)."""
        topics = _registered_topics(
            {"front_door": _make_camera_mock(notifications_enabled_in_config=True)}
        )

        self.assertIn("frigate/front_door/notifications/set", topics)
        self.assertIn("frigate/front_door/notifications/suspend", topics)

    def test_global_set_registered_with_camera_only_notifications(self):
        """The global topic must work when notifications are enabled only at
        the camera level, matching the WebPushClient gating in app.py."""
        topics = _registered_topics(
            {"front_door": _make_camera_mock(notifications_enabled_in_config=True)},
            global_notifications_enabled_in_config=False,
        )

        self.assertIn("frigate/notifications/set", topics)

    def test_global_set_registered_with_global_notifications(self):
        topics = _registered_topics(
            {"front_door": _make_camera_mock()},
            global_notifications_enabled_in_config=True,
        )

        self.assertIn("frigate/notifications/set", topics)

    def test_global_set_not_registered_when_notifications_unconfigured(self):
        topics = _registered_topics(
            {"front_door": _make_camera_mock()},
            global_notifications_enabled_in_config=False,
        )

        self.assertNotIn("frigate/notifications/set", topics)

    def test_disabled_camera_does_not_enable_global_set(self):
        topics = _registered_topics(
            {
                "front_door": _make_camera_mock(
                    enabled=False, notifications_enabled_in_config=True
                )
            },
            global_notifications_enabled_in_config=False,
        )

        self.assertNotIn("frigate/notifications/set", topics)


if __name__ == "__main__":
    unittest.main()
