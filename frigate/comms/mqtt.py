from __future__ import annotations

import logging
import queue
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion

from frigate.comms.base_communicator import Communicator
from frigate.config import FrigateConfig, birdseye_modes_to_mqtt_payload

if TYPE_CHECKING:
    from frigate.comms.dispatcher import Dispatcher

logger = logging.getLogger(__name__)

MQTT_LOOP_TIMEOUT = 1.0
MQTT_RECONNECT_INTERVAL = 10.0
MQTT_SHUTDOWN_FLUSH_TIMEOUT = 5.0
MQTT_ON_CONNECT_RATE_LIMIT = 1.0
MQTT_PUBLISH_WAIT_INTERVAL = 0.1


@dataclass(slots=True)
class QueuedPublish:
    topic: str
    payload: Any
    retain: bool
    done: threading.Event | None = None


class MqttClient(Communicator):
    """Frigate wrapper for mqtt client."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config = config
        self.mqtt_config = config.mqtt
        self.connected = False
        self.client: mqtt.Client | None = None
        self._dispatcher: Callable[[str, Any], Any] | None = None
        self._command_router: Dispatcher | None = None
        self._worker: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._publish_queue: queue.Queue[QueuedPublish] = queue.Queue()
        self._callback_queue: queue.Queue[tuple[Any, ...]] = queue.Queue()
        self._retained_lock = threading.Lock()
        self._pending_retained: dict[str, tuple[Any, bool]] = {}
        self._inflight_retained: dict[int, tuple[str, Any]] = {}
        self._subscription_mid: int | None = None
        self._subscription_ready = False
        self._next_connect_time = 0.0
        self._last_on_connect_dispatch = 0.0

    def subscribe(self, receiver: Callable) -> None:
        """Wrapper for allowing dispatcher to subscribe."""
        self._dispatcher = receiver

    def attach_dispatcher(self, dispatcher: Dispatcher) -> None:
        """Take Dispatcher's command surface and snapshot API."""
        self._command_router = dispatcher

    def start(self) -> None:
        """Start the MQTT worker after all receiver wiring is complete."""

        if self._worker and self._worker.is_alive():
            return

        self._stop_event.clear()
        self._start_worker()

    def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        """Wrapper for publishing when client is in valid state."""
        full_topic = f"{self.mqtt_config.topic_prefix}/{topic}"

        if not self.connected:
            if retain:
                self._queue_retained(full_topic, payload, retain)
            else:
                logger.debug("Unable to publish to %s: client is not connected", topic)
            return

        self._publish_queue.put(QueuedPublish(full_topic, payload, retain))

    def stop(self) -> None:
        if self._worker is None:
            return

        if self.connected and self._subscription_ready:
            publish_done = threading.Event()
            self._publish_queue.put(
                QueuedPublish(
                    f"{self.mqtt_config.topic_prefix}/available",
                    "stopped",
                    True,
                    publish_done,
                )
            )
            publish_done.wait(MQTT_SHUTDOWN_FLUSH_TIMEOUT)

        self._stop_event.set()

        if self.client is not None:
            try:
                self.client.disconnect()
            except Exception:
                logger.debug("MQTT disconnect raised during shutdown", exc_info=True)

        if self._worker.is_alive():
            self._worker.join(MQTT_SHUTDOWN_FLUSH_TIMEOUT + MQTT_LOOP_TIMEOUT)

        self._cleanup_client()
        self._worker = None

    def _notifications_enabled_in_config(self) -> bool:
        """Whether notifications are configured globally or on any camera.

        Notifications can be enabled per camera with the global config left
        disabled, so the global topics must consider both (matching how
        app.py decides to create the WebPushClient).
        """
        return self.config.notifications.enabled_in_config or any(
            cam.enabled and cam.notifications.enabled_in_config
            for cam in self.config.cameras.values()
        )

    def _publish_retained_state(self) -> None:
        """Publish retained MQTT state after a successful subscribe."""
        for camera_name, camera in self.config.cameras.items():
            self.publish(
                f"{camera_name}/enabled/state",
                "ON" if camera.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/recordings/state",
                "ON" if camera.record.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/snapshots/state",
                "ON" if camera.snapshots.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/audio/state",
                "ON" if camera.audio.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/audio_transcription/state",
                "ON" if camera.audio_transcription.live_enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/detect/state",
                "ON" if camera.detect.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/motion/state",
                "ON" if camera.motion.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/improve_contrast/state",
                "ON" if camera.motion.improve_contrast else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/ptz_autotracker/state",
                "ON" if camera.onvif.autotracking.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/motion_threshold/state",
                camera.motion.threshold,
                retain=True,
            )
            self.publish(
                f"{camera_name}/motion_contour_area/state",
                camera.motion.contour_area,
                retain=True,
            )
            self.publish(
                f"{camera_name}/motion",
                "OFF",
                retain=False,
            )
            self.publish(
                f"{camera_name}/birdseye/state",
                "ON" if camera.birdseye.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/birdseye_modes/state",
                (
                    birdseye_modes_to_mqtt_payload(camera.birdseye.modes)
                    if camera.birdseye.enabled
                    else "OFF"
                ),
                retain=True,
            )
            self.publish(
                f"{camera_name}/review_alerts/state",
                "ON" if camera.review.alerts.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/review_detections/state",
                "ON" if camera.review.detections.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/object_descriptions/state",
                "ON" if camera.objects.genai.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/review_descriptions/state",
                "ON" if camera.review.genai.enabled else "OFF",
                retain=True,
            )

            for mask_name, motion_mask in camera.motion.mask.items():
                if motion_mask:
                    self.publish(
                        f"{camera_name}/motion_mask/{mask_name}/state",
                        "ON" if motion_mask.enabled else "OFF",
                        retain=True,
                    )

            for mask_name, object_mask in camera.objects.mask.items():
                if object_mask:
                    self.publish(
                        f"{camera_name}/object_mask/{mask_name}/state",
                        "ON" if object_mask.enabled else "OFF",
                        retain=True,
                    )

            for zone_name, zone in camera.zones.items():
                self.publish(
                    f"{camera_name}/zone/{zone_name}/state",
                    "ON" if zone.enabled else "OFF",
                    retain=True,
                )

        if self._notifications_enabled_in_config():
            self.publish(
                "notifications/state",
                "ON" if self.config.notifications.enabled else "OFF",
                retain=True,
            )

        self.publish(
            "profile/state",
            self.config.active_profile or "none",
            retain=True,
        )
        self.publish("available", "online", retain=True)

    def _create_client(self) -> mqtt.Client:
        """Build a fresh paho client for a single connect attempt."""
        client = mqtt.Client(
            callback_api_version=CallbackAPIVersion.VERSION2,
            client_id=self.mqtt_config.client_id,
            reconnect_on_failure=False,
        )
        client.on_connect = self._on_connect
        client.on_disconnect = self._on_disconnect
        client.on_message = self._on_message
        client.on_subscribe = self._on_subscribe
        client.on_publish = self._on_publish
        client.will_set(
            self.mqtt_config.topic_prefix + "/available",
            payload="offline",
            qos=1,
            retain=True,
        )

        if self.mqtt_config.tls_ca_certs is not None:
            if (
                self.mqtt_config.tls_client_cert is not None
                and self.mqtt_config.tls_client_key is not None
            ):
                client.tls_set(
                    self.mqtt_config.tls_ca_certs,
                    self.mqtt_config.tls_client_cert,
                    self.mqtt_config.tls_client_key,
                )
            else:
                client.tls_set(self.mqtt_config.tls_ca_certs)

        if self.mqtt_config.tls_insecure is not None:
            client.tls_insecure_set(self.mqtt_config.tls_insecure)

        if self.mqtt_config.user is not None:
            client.username_pw_set(
                self.mqtt_config.user,
                password=self.mqtt_config.password,
            )

        return client

    def _start_worker(self) -> None:
        self._worker = threading.Thread(
            target=self._worker_main, name="mqtt", daemon=True
        )
        self._worker.start()
        logger.info("MQTT worker started")

    def _worker_main(self) -> None:
        """Run the worker loop.

        An unexpected crash disables MQTT for this session rather than taking
        Frigate down with it, so it has to announce itself: without the offline
        publish, consumers keep the last retained values and see a healthy
        Frigate that has simply stopped updating.
        """
        try:
            self._mqtt_loop_worker()
        except Exception:
            if not self._stop_event.is_set():
                logger.exception("MQTT worker crashed, disabling MQTT for this session")
                self._stop_event.set()
                self._subscription_ready = False
                self._publish_offline_availability()
                self.connected = False
        finally:
            # nothing drains the queue once the loop is gone, so release any
            # waiter here or stop() blocks for the full flush timeout
            self._requeue_disconnected_publishes()
            self._cleanup_client()

    def _publish_offline_availability(self) -> None:
        """Announce that MQTT is going away after a worker crash.

        _cleanup_client() disconnects cleanly, which tells the broker to
        suppress the will, so the retained topic would otherwise stay "online".
        """
        if self.client is None:
            return

        try:
            message_info = self.client.publish(
                f"{self.mqtt_config.topic_prefix}/available",
                "offline",
                qos=self.config.mqtt.qos,
                retain=True,
            )

            # pumped here rather than through _wait_for_publish() so the drain
            # that may have just crashed is not re-entered
            deadline = time.monotonic() + MQTT_SHUTDOWN_FLUSH_TIMEOUT
            while not message_info.is_published() and time.monotonic() < deadline:
                if (
                    self.client.loop(timeout=MQTT_PUBLISH_WAIT_INTERVAL)
                    != mqtt.MQTT_ERR_SUCCESS
                ):
                    break
        except Exception:
            logger.warning(
                "MQTT is dormant and the broker could not be told Frigate is offline",
                exc_info=True,
            )

    def _mqtt_loop_worker(self) -> None:
        # The worker owns all socket I/O so reconnect, subscribe, and publish
        # ordering stays serialized in one place.
        while not self._stop_event.is_set():
            if self.client is None:
                wait_time = self._next_connect_time - time.monotonic()
                if wait_time > 0:
                    self._stop_event.wait(min(wait_time, MQTT_LOOP_TIMEOUT))
                    continue

                if not self._connect_client():
                    self._next_connect_time = time.monotonic() + MQTT_RECONNECT_INTERVAL
                    continue

            assert self.client is not None
            try:
                result = self.client.loop(timeout=MQTT_LOOP_TIMEOUT)
            except (OSError, mqtt.WebsocketConnectionError) as err:
                logger.warning("MQTT loop error: %s", err)
                self._schedule_reconnect()
                continue

            self._drain_callback_queue()
            self._drain_publish_queue()

            if self._stop_event.is_set():
                break

            if result != mqtt.MQTT_ERR_SUCCESS and self.client is not None:
                logger.error("MQTT loop returned error code: %s", result)
                self._schedule_reconnect()

    def _connect_client(self) -> bool:
        """Create and connect a new client instance owned by the worker thread."""
        try:
            self.client = self._create_client()
            self.client.connect(self.mqtt_config.host, self.mqtt_config.port, 60)
        except Exception as err:
            logger.error("Unable to connect to MQTT server: %s", err)
            self._cleanup_client()
            return False

        return True

    def _cleanup_client(self) -> None:
        """Drop session-specific state and release the current paho client."""
        self.connected = False
        self._subscription_ready = False
        self._subscription_mid = None
        self._requeue_inflight_retained()

        client = self.client
        self.client = None

        if client is None:
            return

        try:
            client.disconnect()
        except Exception:
            logger.debug("MQTT client cleanup raised disconnect error", exc_info=True)

    def _schedule_reconnect(self) -> None:
        """Tear down the current session and arm the next reconnect attempt."""
        if self._stop_event.is_set():
            return

        self.connected = False
        self._subscription_ready = False
        self._subscription_mid = None
        self._requeue_disconnected_publishes()
        self._next_connect_time = time.monotonic() + MQTT_RECONNECT_INTERVAL
        logger.info("MQTT reconnect scheduled in %.1fs", MQTT_RECONNECT_INTERVAL)
        self._cleanup_client()

    def _requeue_inflight_retained(self) -> None:
        """Rebuffer retained publishes paho took but the broker never acked.

        Dropping the client drops paho's outbound queue with it, and the session
        is clean, so the broker will not resume delivery on the new one.
        """
        with self._retained_lock:
            inflight = list(self._inflight_retained.values())
            self._inflight_retained.clear()

        for topic, payload in inflight:
            self._queue_retained(topic, payload, True, overwrite=False)

    def _buffer_undelivered(
        self, queued_publish: QueuedPublish, overwrite: bool = True
    ) -> None:
        """Handle a publish that never reached the broker.

        Releasing the waiter matters on every path: stop() blocks on it, so a
        broker error would otherwise stall shutdown for the full flush timeout.
        """
        if queued_publish.retain:
            self._queue_retained(
                queued_publish.topic,
                queued_publish.payload,
                queued_publish.retain,
                overwrite=overwrite,
            )

        if queued_publish.done is not None:
            queued_publish.done.set()

    def _requeue_disconnected_publishes(self) -> None:
        while True:
            try:
                queued_publish = self._publish_queue.get_nowait()
            except queue.Empty:
                break

            self._buffer_undelivered(queued_publish)

    def _drain_callback_queue(self) -> None:
        # Paho callbacks only enqueue transport events; state transitions run
        # here on the worker thread.
        while True:
            try:
                event = self._callback_queue.get_nowait()
            except queue.Empty:
                break

            event_type = event[0]

            if event_type == "connect":
                self._handle_connect_event(event[1])
            elif event_type == "connect_failure":
                self._handle_connect_failure(event[1])
            elif event_type == "disconnect":
                self._handle_disconnect_event(event[1])
            elif event_type == "subscribed":
                self._handle_subscribe_event(event[1], event[2])
            elif event_type == "message":
                self._handle_inbound_message(event[1], event[2])
            elif event_type == "published":
                self._handle_publish_event(event[1])

    def _drain_publish_queue(self) -> None:
        """Publish queued work only after the session is fully subscribed."""
        if self.connected and not self._subscription_ready:
            return

        while True:
            try:
                queued_publish = self._publish_queue.get_nowait()
            except queue.Empty:
                break

            if not self.connected:
                self._buffer_undelivered(queued_publish)
                continue

            self._publish_direct(queued_publish)

        self._flush_pending_retained()

    def _flush_pending_retained(self) -> None:
        """Replay the latest retained state once the broker session is ready."""
        if not self.connected or not self._subscription_ready:
            return

        with self._retained_lock:
            pending = list(self._pending_retained.items())
            self._pending_retained.clear()

        for topic, (payload, retain) in pending:
            self._publish_direct(QueuedPublish(topic, payload, retain))

    def _publish_direct(self, queued_publish: QueuedPublish) -> None:
        """Publish a queued message from the worker thread's serialized context."""
        if self.client is None:
            self._buffer_undelivered(queued_publish)
            return

        try:
            message_info = self.client.publish(
                queued_publish.topic,
                queued_publish.payload,
                qos=self.config.mqtt.qos,
                retain=queued_publish.retain,
            )
        except (OSError, mqtt.WebsocketConnectionError) as err:
            logger.warning("MQTT publish failed for %s: %s", queued_publish.topic, err)
            # a newer buffered value for this topic wins over the failed one
            self._buffer_undelivered(queued_publish, overwrite=False)
            self._schedule_reconnect()
            return

        if message_info.rc != mqtt.MQTT_ERR_SUCCESS:
            logger.error(
                "Unable to publish to %s: mqtt error %s",
                queued_publish.topic,
                message_info.rc,
            )
            self._buffer_undelivered(queued_publish, overwrite=False)
            self._schedule_reconnect()
            return

        # a successful rc only means paho accepted the message; above qos 0 it
        # is not durable until the broker acks, so keep a copy for replay
        if queued_publish.retain and not message_info.is_published():
            with self._retained_lock:
                self._inflight_retained[message_info.mid] = (
                    queued_publish.topic,
                    queued_publish.payload,
                )

        if queued_publish.done is not None:
            self._wait_for_publish(message_info)
            queued_publish.done.set()

    def _handle_publish_event(self, mid: int) -> None:
        """Drop the replay copy once the broker has acknowledged the message."""
        with self._retained_lock:
            self._inflight_retained.pop(mid, None)

    def _wait_for_publish(self, message_info: mqtt.MQTTMessageInfo) -> None:
        """Pump the loop until a shutdown-critical publish is acknowledged."""
        deadline = time.monotonic() + MQTT_SHUTDOWN_FLUSH_TIMEOUT

        while not message_info.is_published() and time.monotonic() < deadline:
            if self.client is None:
                return

            try:
                result = self.client.loop(timeout=MQTT_PUBLISH_WAIT_INTERVAL)
            except (OSError, mqtt.WebsocketConnectionError) as err:
                logger.warning("MQTT publish wait failed: %s", err)
                self._schedule_reconnect()
                return

            self._drain_callback_queue()

            if result != mqtt.MQTT_ERR_SUCCESS:
                logger.error(
                    "MQTT loop returned error code while waiting for publish: %s",
                    result,
                )
                self._schedule_reconnect()
                return

    def _queue_retained(
        self,
        topic: str,
        payload: Any,
        retain: bool,
        overwrite: bool = True,
    ) -> None:
        """Store the last retained value per topic for replay after reconnect."""
        with self._retained_lock:
            if overwrite or topic not in self._pending_retained:
                self._pending_retained[topic] = (payload, retain)

    def _handle_connect_event(self, reason_code: mqtt.ReasonCode) -> None:  # type: ignore[name-defined]
        """Begin a new session by subscribing before any replay is published."""
        if self.client is None:
            return

        self.connected = True
        self._subscription_ready = False
        self._subscription_mid = None
        logger.debug("MQTT connected")

        try:
            result, mid = self.client.subscribe(
                f"{self.mqtt_config.topic_prefix}/#",
                qos=self.config.mqtt.qos,
            )
        except (OSError, mqtt.WebsocketConnectionError) as err:
            logger.warning("MQTT subscribe failed: %s", err)
            self._schedule_reconnect()
            return

        if result != mqtt.MQTT_ERR_SUCCESS:
            logger.error(
                "Unable to subscribe to MQTT command tree: mqtt error %s", result
            )
            self._schedule_reconnect()
            return

        self._subscription_mid = mid

    def _handle_connect_failure(self, reason_code: mqtt.ReasonCode) -> None:  # type: ignore[name-defined]
        """Record a failed connect attempt and transition into reconnect state."""
        self.connected = False
        logger.error(
            "Unable to connect to MQTT server: %s", self._reason_code_name(reason_code)
        )
        self._schedule_reconnect()

    def _handle_disconnect_event(self, reason_code: mqtt.ReasonCode) -> None:  # type: ignore[name-defined]
        """Handle broker disconnects idempotently from the worker thread."""
        if not self.connected:
            return

        self.connected = False
        self._subscription_ready = False
        self._subscription_mid = None

        if self._stop_event.is_set():
            logger.debug("MQTT disconnected")
            self._cleanup_client()
            return

        logger.error("MQTT disconnected: %s", self._reason_code_name(reason_code))
        self._schedule_reconnect()

    def _handle_subscribe_event(
        self,
        mid: int,
        reason_codes: list[mqtt.ReasonCode],  # type: ignore[name-defined]
    ) -> None:
        """Mark the session ready after SUBACK, then replay retained/runtime state."""
        if mid != self._subscription_mid:
            return

        if any(
            getattr(reason_code, "is_failure", False) for reason_code in reason_codes
        ):
            logger.error("MQTT subscription was rejected by the broker")
            self._schedule_reconnect()
            return

        self._subscription_ready = True
        self._subscription_mid = None

        # a bug in replay should cost a snapshot, not the MQTT session
        try:
            self._publish_retained_state()

            if self._command_router is not None:
                self._command_router.publish_runtime_snapshot(self.publish)
        except Exception:
            logger.exception("Error replaying MQTT state after subscribe")

    def _handle_inbound_message(self, topic: str, payload: str) -> None:
        """Forward supported command topics into Dispatcher semantics."""
        if self._dispatcher is None:
            return

        if not self._is_supported_command_topic(topic):
            return

        if topic == "onConnect":
            now = time.monotonic()
            if now - self._last_on_connect_dispatch < MQTT_ON_CONNECT_RATE_LIMIT:
                logger.debug("Skipping MQTT onConnect replay request due to rate limit")
                return
            self._last_on_connect_dispatch = now

        # a raise here used to end the network thread and take MQTT down
        try:
            self._dispatcher(topic, payload)
        except Exception:
            logger.exception("Error handling MQTT command topic %s", topic)

    def _is_supported_command_topic(self, topic: str) -> bool:
        """Filter the wildcard subscription down to Dispatcher's command surface.

        Load-bearing rather than an optimization: the broker echoes Frigate's own
        publishes back through frigate/#, and Dispatcher republishes topics it
        does not recognize, so forwarding unfiltered would loop.
        """
        if self._command_router is None:
            return False

        # mirrors the gate on the state topic in _publish_retained_state()
        if topic == "notifications/set" and not self._notifications_enabled_in_config():
            return False

        return self._command_router.is_command_topic(topic)

    def _strip_topic_prefix(self, topic: str) -> str:
        return topic.replace(f"{self.mqtt_config.topic_prefix}/", "", 1)

    def _is_success_reason_code(self, reason_code: mqtt.ReasonCode) -> bool:  # type: ignore[name-defined]
        if hasattr(reason_code, "is_failure"):
            return not bool(reason_code.is_failure)

        return bool(reason_code == 0)

    def _reason_code_name(self, reason_code: mqtt.ReasonCode) -> str:  # type: ignore[name-defined]
        if hasattr(reason_code, "getName"):
            return str(reason_code.getName())

        return str(reason_code)

    def _on_connect(
        self,
        client: mqtt.Client,
        userdata: Any,
        flags: Any,
        reason_code: mqtt.ReasonCode,  # type: ignore[name-defined]
        properties: Any,
    ) -> None:
        """Handle broker connect notifications from paho."""
        if self._is_success_reason_code(reason_code):
            self._callback_queue.put(("connect", reason_code))
        else:
            self._callback_queue.put(("connect_failure", reason_code))

    def _on_disconnect(
        self,
        client: mqtt.Client,
        userdata: Any,
        flags: Any,
        reason_code: mqtt.ReasonCode,  # type: ignore[name-defined]
        properties: Any,
    ) -> None:
        """Handle broker disconnect notifications from paho."""
        self._callback_queue.put(("disconnect", reason_code))

    def _on_subscribe(
        self,
        client: mqtt.Client,
        userdata: Any,
        mid: int,
        reason_codes: list[mqtt.ReasonCode],  # type: ignore[name-defined]
        properties: Any,
    ) -> None:
        """Handle subscribe acknowledgements from paho."""
        self._callback_queue.put(("subscribed", mid, reason_codes))

    def _on_publish(
        self,
        client: mqtt.Client,
        userdata: Any,
        mid: int,
        reason_code: mqtt.ReasonCode,  # type: ignore[name-defined]
        properties: Any,
    ) -> None:
        """Handle publish acknowledgements from paho.

        Only tracked retained messages need an event. At the default qos 0
        nothing is tracked, so this stays off the hot publish path.
        """
        with self._retained_lock:
            if mid not in self._inflight_retained:
                return

        self._callback_queue.put(("published", mid))

    def _on_message(
        self,
        client: mqtt.Client,
        userdata: Any,
        message: mqtt.MQTTMessage,
    ) -> None:
        """Queue inbound MQTT messages for processing in the worker loop."""
        topic = self._strip_topic_prefix(message.topic)

        # Ignore everything outside Frigate's command surface before decoding or
        # dispatching into the rest of the app.
        if not self._is_supported_command_topic(topic):
            return

        try:
            payload = message.payload.decode()
        except UnicodeDecodeError:
            logger.debug("Ignoring non-UTF-8 MQTT payload for topic %s", topic)
            return

        self._callback_queue.put(
            (
                "message",
                topic,
                payload,
            )
        )
