import logging
import threading
import time
from typing import Any, Callable, Optional

import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion

from frigate.comms.base_communicator import Communicator
from frigate.config import FrigateConfig

logger = logging.getLogger(__name__)


class MqttClient(Communicator):
    """Frigate wrapper for mqtt client."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config = config
        self.mqtt_config = config.mqtt
        self.connected = False
        self.client: Optional[mqtt.Client] = None
        self._dispatcher: Callable[[str, str], None] = lambda *_: None
        self._reconnect_thread: Optional[threading.Thread] = None
        self._reconnect_delay = 10  # Retry every 10 seconds
        self._stop_reconnect: bool = False

    def subscribe(self, receiver: Callable[[str, str], None]) -> None:
        """Wrapper for allowing dispatcher to subscribe."""
        self._dispatcher = receiver
        self._start()

    def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        """Wrapper for publishing when client is in valid state."""
        if not self.connected or self.client is None:
            logger.debug(f"Unable to publish to {topic}: client is not connected")
            return

        self.client.publish(
            f"{self.mqtt_config.topic_prefix}/{topic}",
            payload,
            qos=self.config.mqtt.qos,
            retain=retain,
        )

    def stop(self) -> None:
        self._stop_reconnect = True
        if self._reconnect_thread is not None and self._reconnect_thread.is_alive():
            self._reconnect_thread.join(timeout=5)
        if self.client is not None:
            try:
                self.client.disconnect()
            finally:
                try:
                    self.client.loop_stop()
                except Exception:
                    pass

    def _set_initial_topics(self) -> None:
        """Set initial state topics."""
        for camera_name, camera in self.config.cameras.items():
            self.publish(
                f"{camera_name}/enabled/state",
                "ON" if camera.enabled_in_config else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/recordings/state",
                "ON" if camera.record.enabled_in_config else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/snapshots/state",
                "ON" if camera.snapshots.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/audio/state",
                "ON" if camera.audio.enabled_in_config else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/detect/state",
                "ON" if camera.detect.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/motion/state",
                "ON",
                retain=True,
            )
            self.publish(
                f"{camera_name}/improve_contrast/state",
                "ON" if camera.motion.improve_contrast else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/ptz_autotracker/state",
                "ON" if camera.onvif.autotracking.enabled_in_config else "OFF",
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
                f"{camera_name}/birdseye_mode/state",
                (
                    camera.birdseye.mode.value.upper()
                    if camera.birdseye.enabled
                    else "OFF"
                ),
                retain=True,
            )
            self.publish(
                f"{camera_name}/review_alerts/state",
                "ON" if camera.review.alerts.enabled_in_config else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/review_detections/state",
                "ON" if camera.review.detections.enabled_in_config else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/object_descriptions/state",
                "ON" if camera.objects.genai.enabled_in_config else "OFF",
                retain=True,
            )
            self.publish(
                f"{camera_name}/review_descriptions/state",
                "ON" if camera.review.genai.enabled_in_config else "OFF",
                retain=True,
            )

        if self.config.notifications.enabled_in_config:
            self.publish(
                "notifications/state",
                "ON" if self.config.notifications.enabled else "OFF",
                retain=True,
            )

        self.publish("available", "online", retain=True)

    @staticmethod
    def _reason_info(reason_code: object) -> str:
        """Return human_readable_name for a Paho reason code."""
        # Name string
        if hasattr(reason_code, "getName") and callable(getattr(reason_code, "getName")):
            try:
                name = str(getattr(reason_code, "getName")())
            except Exception:
                name = str(reason_code)
        else:
            name = str(reason_code)

        return name

    def on_mqtt_command(
        self, client: mqtt.Client, userdata: Any, message: mqtt.MQTTMessage
    ) -> None:
        self._dispatcher(
            message.topic.replace(f"{self.mqtt_config.topic_prefix}/", "", 1),
            message.payload.decode(),
        )

    def _on_connect(
        self,
        client: mqtt.Client,
        userdata: Any,
        flags: Any,
        reason_code: object,
        properties: Any,
    ) -> None:
        """Mqtt connection callback."""
        threading.current_thread().name = "mqtt"
        reason_name = self._reason_info(reason_code)

        # Check for connection failure by comparing reason name
        if reason_name != "Success":
            if reason_name == "Server unavailable":
                logger.error("Unable to connect to MQTT server: MQTT Server unavailable")
            elif reason_name == "Bad user name or password":
                logger.error("Unable to connect to MQTT server: MQTT Bad username or password")
            elif reason_name == "Not authorized":
                logger.error("Unable to connect to MQTT server: MQTT Not authorized")
            else:
                logger.error(f"Unable to connect to MQTT server: Connection refused. Error: {reason_name}")
            # Don't set connected = True on connection failure
            return

        self.connected = True
        logger.debug("MQTT connected")
        client.subscribe(f"{self.mqtt_config.topic_prefix}/#", qos=self.config.mqtt.qos)
        self._set_initial_topics()

    def _on_disconnect(
        self,
        client: mqtt.Client,
        userdata: Any,
        flags: Any,
        reason_code: mqtt.ReasonCode,  # type: ignore[name-defined]
        properties: Any,
    ) -> None:
        """Mqtt disconnection callback."""
        self.connected = False
        # Debug reason code thoroughly
        reason_name = (
            reason_code.getName()
            if hasattr(reason_code, "getName")
            else str(reason_code)
        )
        reason_value = getattr(reason_code, "value", reason_code)
        logger.error(
            f"MQTT disconnected - reason: '{reason_name}', code: {reason_value}, type: {type(reason_code)}"
        )

        # Don't attempt reconnection if we're stopping or if it was a clean disconnect
        if self._stop_reconnect:
            logger.error("MQTT not reconnecting - stop flag set")
            return

        if reason_code == 0:
            logger.error("MQTT not reconnecting - clean disconnect (code 0)")
            return

        logger.error("MQTT will attempt reconnection...")

        # Start reconnection in a separate thread to avoid blocking
        if self._reconnect_thread is None or not self._reconnect_thread.is_alive():
            self._reconnect_thread = threading.Thread(
                target=self._reconnect_loop, name="mqtt-reconnect", daemon=True
            )
            self._reconnect_thread.start()

    def _start(self) -> None:
        """Start mqtt client."""
        self.client = mqtt.Client(
            callback_api_version=CallbackAPIVersion.VERSION2,
            client_id=self.mqtt_config.client_id,
        )
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.will_set(
            self.mqtt_config.topic_prefix + "/available",
            payload="offline",
            qos=1,
            retain=True,
        )

        # register callbacks
        callback_types = [
            "enabled",
            "recordings",
            "snapshots",
            "detect",
            "audio",
            "motion",
            "improve_contrast",
            "ptz_autotracker",
            "motion_threshold",
            "motion_contour_area",
            "birdseye",
            "birdseye_mode",
            "review_alerts",
            "review_detections",
            "genai",
        ]

        for name in self.config.cameras.keys():
            for callback in callback_types:
                self.client.message_callback_add(
                    f"{self.mqtt_config.topic_prefix}/{name}/{callback}/set",
                    self.on_mqtt_command,
                )

            if self.config.cameras[name].onvif.host:
                self.client.message_callback_add(
                    f"{self.mqtt_config.topic_prefix}/{name}/ptz",
                    self.on_mqtt_command,
                )

        if self.config.notifications.enabled_in_config:
            self.client.message_callback_add(
                f"{self.mqtt_config.topic_prefix}/notifications/set",
                self.on_mqtt_command,
            )

        self.client.message_callback_add(
            f"{self.mqtt_config.topic_prefix}/onConnect", self.on_mqtt_command
        )

        self.client.message_callback_add(
            f"{self.mqtt_config.topic_prefix}/restart", self.on_mqtt_command
        )

        if self.mqtt_config.tls_ca_certs is not None:
            if (
                self.mqtt_config.tls_client_cert is not None
                and self.mqtt_config.tls_client_key is not None
            ):
                self.client.tls_set(
                    self.mqtt_config.tls_ca_certs,
                    self.mqtt_config.tls_client_cert,
                    self.mqtt_config.tls_client_key,
                )
            else:
                self.client.tls_set(self.mqtt_config.tls_ca_certs)
        if self.mqtt_config.tls_insecure is not None:
            self.client.tls_insecure_set(self.mqtt_config.tls_insecure)
        if self.mqtt_config.user is not None:
            self.client.username_pw_set(
                self.mqtt_config.user, password=self.mqtt_config.password
            )
        try:
            # https://stackoverflow.com/a/55390477
            # with connect_async, retries are handled automatically
            self.client.connect_async(self.mqtt_config.host, self.mqtt_config.port, 60)
            self.client.loop_start()
        except Exception as e:
            logger.error(f"Unable to connect to MQTT server: {e}")
            return

    def _reconnect_loop(self) -> None:
        """Handle MQTT reconnection using fresh client creation, retrying every 10 seconds indefinitely."""
        logger.error("MQTT reconnection loop started")
        attempt = 0
        
        while not self._stop_reconnect and not self.connected:
            attempt += 1

            logger.error(
                f"Will attempt MQTT reconnection in {self._reconnect_delay} seconds (attempt {attempt})"
            )

            # Wait with ability to exit early if stopping
            delay_count = 0
            while delay_count < self._reconnect_delay:
                if self._stop_reconnect:
                    logger.error("MQTT reconnection stopped during delay")  # type: ignore[unreachable]
                    return
                time.sleep(1)
                delay_count += 1

            # Double-check stop flag after delay
            if self._stop_reconnect:
                logger.error("MQTT reconnection stopped after delay")  # type: ignore[unreachable]
                return

            try:
                logger.error(
                    f"Creating fresh MQTT client for reconnection attempt {attempt}..."
                )

                # Clean up old client if it exists
                if self.client is not None:
                    try:
                        self.client.disconnect()
                        self.client.loop_stop()
                    except Exception:
                        pass  # Ignore cleanup errors

                # Create completely fresh client and attempt connection
                self._start()

                # Give the connection attempt some time to complete
                wait_count = 0
                while wait_count < 5:  # Wait up to 5 seconds for connection
                    if self.connected:
                        logger.error(  # type: ignore[unreachable]
                            f"MQTT fresh connection successful on attempt {attempt}!"
                        )
                        return
                    time.sleep(1)
                    wait_count += 1

                logger.error(
                    f"MQTT fresh connection attempt {attempt} timed out, will retry"
                )
                # Continue the outer while loop to retry
            except Exception as e:
                logger.error(f"MQTT fresh connection attempt {attempt} failed: {e}")
                # Continue the outer while loop to retry

        logger.error("MQTT reconnection loop finished")
