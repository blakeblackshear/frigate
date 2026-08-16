import os
import threading
import unittest
from typing import Any
from unittest.mock import MagicMock, patch

import paho.mqtt.client as mqtt

from frigate.comms.dispatcher import Dispatcher
from frigate.comms.mqtt import MqttClient, QueuedPublish
from frigate.config import FrigateConfig
from frigate.const import MODEL_CACHE_DIR


class RuntimeSnapshotReceiver:
    def __init__(self) -> None:
        self.messages: list[tuple[str, str]] = []

    def _receive(self, topic: str, payload: str) -> None:
        self.messages.append((topic, payload))


class FakeMessage:
    def __init__(self, topic: str, payload: bytes) -> None:
        self.topic = topic
        self.payload = payload


class FakeCommunicator:
    def __init__(self) -> None:
        self.receiver = None
        self.dispatcher = None
        self.started = False

    def subscribe(self, receiver) -> None:
        self.receiver = receiver

    def attach_dispatcher(self, dispatcher) -> None:
        self.dispatcher = dispatcher

    def start(self) -> None:
        self.started = True

    def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        return None

    def stop(self) -> None:
        return None


class FakeSnapshotCommunicator(FakeCommunicator):
    def start(self) -> None:
        self.started = True
        assert self.dispatcher is not None
        self.dispatcher.publish_runtime_snapshot(lambda *_args, **_kwargs: None)


def build_config() -> FrigateConfig:
    config = {
        "mqtt": {
            "host": "mqtt",
            "client_id": "frigate-test",
            "topic_prefix": "frigate",
        },
        "notifications": {"enabled": True},
        "cameras": {
            "front": {
                "ffmpeg": {
                    "inputs": [
                        {
                            "path": "rtsp://10.0.0.1:554/video",
                            "roles": ["detect", "audio"],
                        }
                    ]
                },
                "detect": {
                    "height": 1080,
                    "width": 1920,
                    "fps": 5,
                },
                "audio": {"enabled": True},
                "notifications": {"enabled": False},
                "onvif": {"host": "10.0.0.5"},
                "motion": {
                    "mask": {
                        "motion_mask_1": {
                            "coordinates": "0,0,1,0,1,1,0,1",
                        }
                    }
                },
                "objects": {
                    "track": ["person"],
                    "mask": {
                        "object_mask_1": {
                            "coordinates": "0,0,1,0,1,1,0,1",
                        }
                    },
                },
                "zones": {
                    "driveway": {
                        "coordinates": "0.1,0.1,0.9,0.1,0.9,0.9,0.1,0.9",
                        "objects": ["person"],
                    }
                },
            }
        },
    }
    return FrigateConfig(**config)


def build_dispatcher(config: FrigateConfig, communicators: list[Any]) -> Dispatcher:
    """Build a real Dispatcher with only the activity managers stubbed out."""
    with (
        patch("frigate.comms.dispatcher.CameraActivityManager") as mock_camera_activity,
        patch("frigate.comms.dispatcher.AudioActivityManager") as mock_audio_activity,
    ):
        mock_camera_activity.return_value.last_camera_activity = {}
        mock_audio_activity.return_value.current_audio_detections = {}

        return Dispatcher(config, MagicMock(), MagicMock(), {}, communicators)


class TestMqttClientLifecycle(unittest.TestCase):
    def setUp(self) -> None:
        if not os.path.exists(MODEL_CACHE_DIR) and not os.path.islink(MODEL_CACHE_DIR):
            os.makedirs(MODEL_CACHE_DIR)

        self.config = build_config()
        self.client = MqttClient(self.config)
        self.receiver = RuntimeSnapshotReceiver()
        self.client.attach_dispatcher(build_dispatcher(self.config, []))

    def test_subscribe_stores_receiver_without_starting_worker(self) -> None:
        client = MqttClient(self.config)

        with patch.object(client, "_start_worker") as mock_start_worker:
            client.subscribe(self.receiver._receive)

        self.assertIsNotNone(client._dispatcher)
        self.assertIs(client._dispatcher.__self__, self.receiver)
        self.assertIs(client._dispatcher.__func__, RuntimeSnapshotReceiver._receive)
        mock_start_worker.assert_not_called()

    def test_attach_dispatcher_supplies_command_surface(self) -> None:
        client = MqttClient(self.config)

        self.assertFalse(client._is_supported_command_topic("front/detect/set"))

        dispatcher = build_dispatcher(self.config, [])
        client.attach_dispatcher(dispatcher)

        self.assertIs(client._command_router, dispatcher)
        self.assertTrue(client._is_supported_command_topic("front/detect/set"))

    def test_start_starts_worker_after_receiver_registration(self) -> None:
        self.client.subscribe(self.receiver._receive)

        with patch.object(self.client, "_start_worker") as mock_start_worker:
            self.client.start()

        mock_start_worker.assert_called_once()

    def test_dispatcher_initializes_state_before_starting_communicators(self) -> None:
        fake_comm = FakeSnapshotCommunicator()
        dispatcher = build_dispatcher(self.config, [fake_comm])

        self.assertIsNone(dispatcher.web_push_client)
        self.assertIs(fake_comm.receiver.__self__, dispatcher)
        self.assertIs(fake_comm.dispatcher, dispatcher)
        self.assertFalse(fake_comm.started)

        dispatcher.start_communicators()

        self.assertTrue(fake_comm.started)

    def test_publish_drops_ephemeral_and_coalesces_retained_while_disconnected(
        self,
    ) -> None:
        self.client.publish("front/events", "payload")
        self.assertTrue(self.client._publish_queue.empty())

        self.client.publish("profile/state", "armed", retain=True)
        self.client.publish("profile/state", "disarmed", retain=True)

        self.assertEqual(
            self.client._pending_retained["frigate/profile/state"],
            ("disarmed", True),
        )

    def test_publish_buffers_messages_until_subscription_ready(self) -> None:
        self.client.connected = True

        self.client.publish("front/events", "payload")
        self.client.publish("profile/state", "armed", retain=True)

        self.assertEqual(self.client._publish_queue.qsize(), 2)
        self.assertEqual(self.client._pending_retained, {})

    @patch("frigate.comms.mqtt.mqtt.Client")
    def test_connect_client_initializes_manual_loop_client(
        self, mock_client_cls
    ) -> None:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        connected = self.client._connect_client()

        self.assertTrue(connected)
        mock_client_cls.assert_called_once_with(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id="frigate-test",
            reconnect_on_failure=False,
        )
        self.assertIs(mock_client.on_connect.__self__, self.client)
        self.assertIs(mock_client.on_connect.__func__, MqttClient._on_connect)
        self.assertIs(mock_client.on_disconnect.__self__, self.client)
        self.assertIs(mock_client.on_disconnect.__func__, MqttClient._on_disconnect)
        self.assertIs(mock_client.on_message.__self__, self.client)
        self.assertIs(mock_client.on_message.__func__, MqttClient._on_message)
        self.assertIs(mock_client.on_subscribe.__self__, self.client)
        self.assertIs(mock_client.on_subscribe.__func__, MqttClient._on_subscribe)
        mock_client.connect.assert_called_once_with("mqtt", 1883, 60)

    def test_handle_connect_failure_leaves_client_disconnected(self) -> None:
        self.client.client = MagicMock()
        reason_code = MagicMock()
        reason_code.getName.return_value = "Not authorized"

        with patch.object(
            self.client, "_schedule_reconnect"
        ) as mock_schedule_reconnect:
            self.client._handle_connect_failure(reason_code)

        self.assertFalse(self.client.connected)
        mock_schedule_reconnect.assert_called_once()

    def test_handle_connect_event_subscribes_wildcard_topic(self) -> None:
        self.client.client = MagicMock()
        self.client.client.subscribe.return_value = (mqtt.MQTT_ERR_SUCCESS, 42)

        self.client._handle_connect_event(MagicMock())

        self.assertTrue(self.client.connected)
        self.assertEqual(self.client._subscription_mid, 42)
        self.client.client.subscribe.assert_called_once_with("frigate/#", qos=0)

    def test_handle_connect_event_reconnects_on_recoverable_subscribe_error(
        self,
    ) -> None:
        self.client.client = MagicMock()
        self.client.client.subscribe.side_effect = BrokenPipeError("broken pipe")

        with patch.object(
            self.client, "_schedule_reconnect"
        ) as mock_schedule_reconnect:
            self.client._handle_connect_event(MagicMock())

        mock_schedule_reconnect.assert_called_once()

    def test_handle_subscribe_event_publishes_snapshots_after_matching_suback(
        self,
    ) -> None:
        self.client.connected = True
        self.client._subscription_mid = 7

        with (
            patch.object(self.client, "_publish_retained_state") as mock_retained,
            patch.object(
                self.client._command_router, "publish_runtime_snapshot"
            ) as mock_snapshot,
        ):
            self.client._handle_subscribe_event(7, [MagicMock(is_failure=False)])

        self.assertTrue(self.client._subscription_ready)
        mock_retained.assert_called_once()
        mock_snapshot.assert_called_once_with(self.client.publish)

    def test_handle_subscribe_event_ignores_other_suback_mid(self) -> None:
        self.client.connected = True
        self.client._subscription_mid = 8

        with (
            patch.object(self.client, "_publish_retained_state") as mock_retained,
            patch.object(
                self.client._command_router, "publish_runtime_snapshot"
            ) as mock_snapshot,
        ):
            self.client._handle_subscribe_event(9, [MagicMock(is_failure=False)])

        self.assertFalse(self.client._subscription_ready)
        mock_retained.assert_not_called()
        mock_snapshot.assert_not_called()

    def test_on_message_strips_prefix_and_dispatches_supported_topic(self) -> None:
        dispatcher = MagicMock()
        self.client._dispatcher = dispatcher

        self.client._on_message(
            MagicMock(),
            None,
            FakeMessage("frigate/front/detect/set", b"ON"),
        )
        self.client._drain_callback_queue()

        dispatcher.assert_called_once_with("front/detect/set", "ON")

    def test_on_message_ignores_unsupported_state_topic(self) -> None:
        dispatcher = MagicMock()
        self.client._dispatcher = dispatcher

        self.client._on_message(
            MagicMock(),
            None,
            FakeMessage("frigate/front/detect/state", b"ON"),
        )
        self.client._drain_callback_queue()

        dispatcher.assert_not_called()

    def test_on_message_ignores_non_utf8_payloads(self) -> None:
        self.client._on_message(
            MagicMock(),
            None,
            FakeMessage("frigate/onConnect", b"\xff"),
        )

        self.assertTrue(self.client._callback_queue.empty())

    def test_on_connect_requests_are_rate_limited(self) -> None:
        dispatcher = MagicMock()
        self.client._dispatcher = dispatcher

        with patch("frigate.comms.mqtt.time.monotonic", side_effect=[100.0, 100.1]):
            self.client._handle_inbound_message("onConnect", "")
            self.client._handle_inbound_message("onConnect", "")

        dispatcher.assert_called_once_with("onConnect", "")

    def test_supported_command_topics_preserve_command_surface(self) -> None:
        for topic in (
            "front/detect/set",
            "front/audio_transcription/set",
            "front/notifications/set",
            "front/notifications/suspend",
            "front/zone/driveway/set",
            "front/motion_mask/motion_mask_1/set",
            "front/ptz",
            "notifications/set",
            "profile/set",
            "onConnect",
            "restart",
        ):
            with self.subTest(topic=topic):
                self.assertTrue(self.client._is_supported_command_topic(topic))

        for topic in (
            # Frigate's own publishes echoing back through the wildcard
            "front/detect/state",
            "available",
            "front/notifications/suspended",
            "front/zone/set",
            "front/nonsense/set",
            "nonsense/set",
        ):
            with self.subTest(topic=topic):
                self.assertFalse(self.client._is_supported_command_topic(topic))

    def test_command_surface_tracks_dispatcher_handlers(self) -> None:
        """The allowlist is derived, so a new handler is routable for free."""
        router = self.client._command_router
        router._camera_settings_handlers["brand_new_toggle"] = MagicMock()

        self.assertTrue(
            self.client._is_supported_command_topic("front/brand_new_toggle/set")
        )

    def test_global_notifications_set_follows_config_gate(self) -> None:
        """The command gate must match the publish gate in
        _publish_retained_state: with notifications unconfigured there is no
        state topic, so the command must not flip runtime state either."""
        self.assertTrue(self.client._notifications_enabled_in_config())
        self.assertTrue(self.client._is_supported_command_topic("notifications/set"))

        with patch.object(
            self.client, "_notifications_enabled_in_config", return_value=False
        ):
            self.assertFalse(
                self.client._is_supported_command_topic("notifications/set")
            )
            # per-camera topics stay routable regardless of the global gate
            self.assertTrue(
                self.client._is_supported_command_topic("front/notifications/set")
            )
            self.assertTrue(
                self.client._is_supported_command_topic("front/notifications/suspend")
            )

    def test_publish_direct_waits_for_flush_barrier(self) -> None:
        mock_client = MagicMock()
        mock_client.loop.return_value = mqtt.MQTT_ERR_SUCCESS
        self.client.client = mock_client
        message_info = MagicMock(rc=mqtt.MQTT_ERR_SUCCESS, mid=1)
        # inflight tracking checks once, then _wait_for_publish polls
        message_info.is_published.side_effect = [False, False, True]
        mock_client.publish.return_value = message_info
        barrier = MagicMock()

        self.client._publish_direct(
            QueuedPublish("frigate/available", "stopped", True, barrier)
        )

        mock_client.loop.assert_called_once()
        barrier.set.assert_called_once()

    def test_shutdown_barrier_releases_when_publish_raises(self) -> None:
        """stop() waits on this barrier, so a broker error must not stall
        shutdown for the full flush timeout."""
        self.client.client = MagicMock()
        self.client.client.publish.side_effect = BrokenPipeError("broken pipe")
        barrier = threading.Event()

        with patch.object(self.client, "_schedule_reconnect"):
            self.client._publish_direct(
                QueuedPublish("frigate/available", "stopped", True, barrier)
            )

        self.assertTrue(barrier.is_set())
        self.assertEqual(
            self.client._pending_retained["frigate/available"], ("stopped", True)
        )

    def test_shutdown_barrier_releases_on_publish_error_code(self) -> None:
        self.client.client = MagicMock()
        self.client.client.publish.return_value = MagicMock(rc=mqtt.MQTT_ERR_NO_CONN)
        barrier = threading.Event()

        with patch.object(self.client, "_schedule_reconnect"):
            self.client._publish_direct(
                QueuedPublish("frigate/available", "stopped", True, barrier)
            )

        self.assertTrue(barrier.is_set())

    def test_shutdown_barrier_releases_when_requeued_while_disconnected(self) -> None:
        barrier = threading.Event()
        self.client._publish_queue.put(
            QueuedPublish("frigate/available", "stopped", True, barrier)
        )

        self.client._requeue_disconnected_publishes()

        self.assertTrue(barrier.is_set())
        self.assertEqual(
            self.client._pending_retained["frigate/available"], ("stopped", True)
        )

    def test_shutdown_barrier_releases_when_worker_crashes(self) -> None:
        """stop() can queue the final publish just as the worker dies, and
        nothing drains the queue after that."""
        barrier = threading.Event()
        self.client._publish_queue.put(
            QueuedPublish("frigate/available", "stopped", True, barrier)
        )

        with patch.object(
            self.client,
            "_mqtt_loop_worker",
            side_effect=RuntimeError("unexpected bug"),
        ):
            self.client._worker_main()

        self.assertTrue(barrier.is_set())

    def test_unacked_retained_publish_survives_reconnect(self) -> None:
        """Above qos 0 a successful rc only means paho queued the message, and
        dropping the client drops its outbound queue with it."""
        mock_client = MagicMock()
        message_info = MagicMock(rc=mqtt.MQTT_ERR_SUCCESS, mid=12)
        message_info.is_published.return_value = False
        mock_client.publish.return_value = message_info
        self.client.client = mock_client
        self.client.connected = True

        self.client._publish_direct(
            QueuedPublish("frigate/profile/state", "armed", True)
        )
        self.assertEqual(
            self.client._inflight_retained[12], ("frigate/profile/state", "armed")
        )

        self.client._cleanup_client()

        self.assertEqual(self.client._inflight_retained, {})
        self.assertEqual(
            self.client._pending_retained["frigate/profile/state"], ("armed", True)
        )

    def test_acked_retained_publish_is_not_replayed(self) -> None:
        mock_client = MagicMock()
        message_info = MagicMock(rc=mqtt.MQTT_ERR_SUCCESS, mid=12)
        message_info.is_published.return_value = False
        mock_client.publish.return_value = message_info
        self.client.client = mock_client
        self.client.connected = True

        self.client._publish_direct(
            QueuedPublish("frigate/profile/state", "armed", True)
        )
        self.client._on_publish(mock_client, None, 12, MagicMock(), None)
        self.client._drain_callback_queue()

        self.assertEqual(self.client._inflight_retained, {})

        self.client._cleanup_client()

        self.assertEqual(self.client._pending_retained, {})

    def test_already_published_retained_is_not_tracked(self) -> None:
        """At the default qos 0 paho reports the message as published inline,
        so there is nothing to wait on."""
        mock_client = MagicMock()
        message_info = MagicMock(rc=mqtt.MQTT_ERR_SUCCESS, mid=12)
        message_info.is_published.return_value = True
        mock_client.publish.return_value = message_info
        self.client.client = mock_client
        self.client.connected = True

        self.client._publish_direct(
            QueuedPublish("frigate/profile/state", "armed", True)
        )

        self.assertEqual(self.client._inflight_retained, {})

    def test_wait_for_publish_survives_disconnect_during_wait(self) -> None:
        mock_client = MagicMock()
        self.client.client = mock_client
        self.client.connected = True
        message_info = MagicMock(rc=mqtt.MQTT_ERR_SUCCESS)
        message_info.is_published.side_effect = [False, False]

        loop_calls = [0]

        def loop_side_effect(timeout: float) -> int:
            if loop_calls[0] == 0:
                self.client._callback_queue.put(("disconnect", 1))
            loop_calls[0] += 1
            return mqtt.MQTT_ERR_SUCCESS

        mock_client.loop.side_effect = loop_side_effect

        self.client._wait_for_publish(message_info)

        self.assertEqual(loop_calls[0], 1)
        self.assertIsNone(self.client.client)

    def test_publish_direct_reconnects_on_recoverable_publish_error(self) -> None:
        self.client.client = MagicMock()
        self.client.client.publish.side_effect = BrokenPipeError("broken pipe")

        with patch.object(
            self.client, "_schedule_reconnect"
        ) as mock_schedule_reconnect:
            self.client._publish_direct(
                QueuedPublish("frigate/profile/state", "armed", True)
            )

        self.assertEqual(
            self.client._pending_retained["frigate/profile/state"],
            ("armed", True),
        )
        mock_schedule_reconnect.assert_called_once()

    def test_mqtt_loop_worker_reconnects_on_recoverable_loop_error(self) -> None:
        self.client.client = MagicMock()
        self.client.client.loop.side_effect = OSError("socket closed")

        def stop_after_reconnect() -> None:
            self.client._stop_event.set()

        with patch.object(
            self.client,
            "_schedule_reconnect",
            side_effect=stop_after_reconnect,
        ) as mock_schedule_reconnect:
            self.client._mqtt_loop_worker()

        mock_schedule_reconnect.assert_called_once()

    def test_worker_main_goes_dormant_on_unexpected_exception(self) -> None:
        with patch.object(
            self.client,
            "_mqtt_loop_worker",
            side_effect=RuntimeError("unexpected bug"),
        ):
            self.client._worker_main()

        self.assertTrue(self.client._stop_event.is_set())
        self.assertFalse(self.client.connected)
        self.assertFalse(self.client._subscription_ready)
        self.assertIsNone(self.client.client)

    def test_worker_crash_announces_offline_before_disconnecting(self) -> None:
        """The clean disconnect in cleanup suppresses the will, so a dormant
        MQTT session must say so itself or consumers keep the stale values."""
        mock_client = MagicMock()
        mock_client.publish.return_value = MagicMock(
            rc=mqtt.MQTT_ERR_SUCCESS, **{"is_published.return_value": True}
        )
        self.client.client = mock_client
        self.client.connected = True

        with patch.object(
            self.client,
            "_mqtt_loop_worker",
            side_effect=RuntimeError("unexpected bug"),
        ):
            self.client._worker_main()

        mock_client.publish.assert_called_once_with(
            "frigate/available",
            "offline",
            qos=self.config.mqtt.qos,
            retain=True,
        )
        # the announcement has to land before the socket is torn down
        self.assertLess(
            mock_client.method_calls.index(
                next(c for c in mock_client.method_calls if c[0] == "publish")
            ),
            mock_client.method_calls.index(
                next(c for c in mock_client.method_calls if c[0] == "disconnect")
            ),
        )

    def test_worker_crash_stays_dormant_when_offline_publish_fails(self) -> None:
        self.client.client = MagicMock()
        self.client.client.publish.side_effect = BrokenPipeError("broken pipe")

        with patch.object(
            self.client,
            "_mqtt_loop_worker",
            side_effect=RuntimeError("unexpected bug"),
        ):
            self.client._worker_main()

        self.assertTrue(self.client._stop_event.is_set())
        self.assertIsNone(self.client.client)

    def test_command_handler_exception_does_not_kill_worker(self) -> None:
        """A raise in a dispatcher handler used to end the network thread and
        take MQTT down until the next Frigate restart."""
        self.client._dispatcher = MagicMock(side_effect=RuntimeError("handler bug"))
        self.client._callback_queue.put(("message", "front/detect/set", "ON"))
        self.client._callback_queue.put(("message", "front/motion/set", "ON"))

        with self.assertLogs("frigate.comms.mqtt", level="ERROR"):
            self.client._drain_callback_queue()

        self.assertEqual(self.client._dispatcher.call_count, 2)

    def test_snapshot_replay_exception_does_not_kill_worker(self) -> None:
        self.client.connected = True
        self.client._subscription_mid = 3

        with (
            patch.object(
                self.client,
                "_publish_retained_state",
                side_effect=RuntimeError("replay bug"),
            ),
            self.assertLogs("frigate.comms.mqtt", level="ERROR"),
        ):
            self.client._handle_subscribe_event(3, [MagicMock(is_failure=False)])

        self.assertTrue(self.client._subscription_ready)

    def test_schedule_reconnect_drops_stale_ephemeral_and_preserves_retained(
        self,
    ) -> None:
        mock_client = MagicMock()
        message_info = MagicMock(rc=mqtt.MQTT_ERR_SUCCESS)
        mock_client.publish.return_value = message_info
        self.client.client = mock_client
        self.client.connected = True
        self.client._subscription_ready = True

        self.client.publish("front/events", "ephemeral")
        self.client.publish("profile/state", "armed", retain=True)

        self.client._schedule_reconnect()

        self.assertTrue(self.client._publish_queue.empty())
        self.assertEqual(
            self.client._pending_retained["frigate/profile/state"],
            ("armed", True),
        )

        self.client.client = mock_client
        self.client.connected = True
        self.client._subscription_ready = True
        self.client._drain_publish_queue()

        mock_client.publish.assert_called_once_with(
            "frigate/profile/state",
            "armed",
            qos=self.config.mqtt.qos,
            retain=True,
        )

    def test_stop_disconnects_client_and_joins_worker(self) -> None:
        worker = MagicMock()
        worker.is_alive.return_value = True
        self.client._worker = worker
        mock_client = MagicMock()
        self.client.client = mock_client

        self.client.stop()

        self.assertTrue(self.client._stop_event.is_set())
        self.assertGreaterEqual(mock_client.disconnect.call_count, 1)
        worker.join.assert_called_once()

    def test_stop_skips_stopped_publish_until_subscription_ready(self) -> None:
        worker = MagicMock()
        worker.is_alive.return_value = True
        self.client._worker = worker
        self.client.client = MagicMock()
        self.client.connected = True
        self.client._subscription_ready = False

        with patch.object(self.client._publish_queue, "put") as mock_queue_put:
            self.client.stop()

        mock_queue_put.assert_not_called()

    def test_duplicate_disconnect_callback_is_safe(self) -> None:
        self.client.connected = True

        with patch.object(
            self.client, "_schedule_reconnect"
        ) as mock_schedule_reconnect:
            self.client._handle_disconnect_event(MagicMock())
            self.client._handle_disconnect_event(MagicMock())

        mock_schedule_reconnect.assert_called_once()

    def test_publish_retained_state_emits_expected_topic_families(self) -> None:
        published_topics: list[tuple[str, Any, bool]] = []

        with patch.object(
            self.client,
            "publish",
            side_effect=lambda topic, payload, retain=False: published_topics.append(
                (topic, payload, retain)
            ),
        ):
            self.client._publish_retained_state()

        topics = {topic for topic, _, _ in published_topics}
        self.assertIn("front/enabled/state", topics)
        self.assertIn("front/motion_mask/motion_mask_1/state", topics)
        self.assertIn("front/object_mask/object_mask_1/state", topics)
        self.assertIn("front/zone/driveway/state", topics)
        self.assertIn("notifications/state", topics)
        self.assertIn("profile/state", topics)
        self.assertIn("available", topics)

    def test_publish_retained_state_uses_runtime_values(self) -> None:
        camera = self.config.cameras["front"]
        camera.enabled_in_config = True
        camera.enabled = False
        camera.record.enabled_in_config = True
        camera.record.enabled = False
        camera.audio.enabled_in_config = True
        camera.audio.enabled = False
        camera.motion.enabled = False
        camera.onvif.autotracking.enabled_in_config = True
        camera.onvif.autotracking.enabled = False
        camera.review.alerts.enabled_in_config = True
        camera.review.alerts.enabled = False
        camera.review.detections.enabled_in_config = True
        camera.review.detections.enabled = False
        camera.objects.genai.enabled_in_config = True
        camera.objects.genai.enabled = False
        camera.review.genai.enabled_in_config = True
        camera.review.genai.enabled = False
        self.config.notifications.enabled_in_config = True
        self.config.notifications.enabled = False

        published_states: dict[str, Any] = {}

        with patch.object(
            self.client,
            "publish",
            side_effect=lambda topic, payload, retain=False: (
                published_states.__setitem__(topic, payload)
            ),
        ):
            self.client._publish_retained_state()

        self.assertEqual(published_states["front/enabled/state"], "OFF")
        self.assertEqual(published_states["front/recordings/state"], "OFF")
        self.assertEqual(published_states["front/audio/state"], "OFF")
        self.assertEqual(published_states["front/motion/state"], "OFF")
        self.assertEqual(published_states["front/ptz_autotracker/state"], "OFF")
        self.assertEqual(published_states["front/review_alerts/state"], "OFF")
        self.assertEqual(published_states["front/review_detections/state"], "OFF")
        self.assertEqual(published_states["front/object_descriptions/state"], "OFF")
        self.assertEqual(published_states["front/review_descriptions/state"], "OFF")
        self.assertEqual(published_states["notifications/state"], "OFF")
