import logging
import threading

from typing import Any, Callable

import paho.mqtt.client as mqtt

from frigate.comms.dispatcher import Communicator
from frigate.config import FrigateConfig


logger = logging.getLogger(__name__)


class MqttClient(Communicator):  # type: ignore[misc]
    """Frigate wrapper for mqtt client."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config = config
        self.mqtt_config = config.mqtt
        self.connected: bool = False

    def subscribe(self, receiver: Callable) -> None:
        """Wrapper for allowing dispatcher to subscribe."""
        self._dispatcher = receiver
        self._start()

    def publish(self, topic: str, payload: Any, retain: bool = False) -> None:
        """Wrapper for publishing when client is in valid state."""
        if not self.connected:
            logger.error(f"Unable to publish to {topic}: client is not connected")
            return

        self.client.publish(
            f"{self.mqtt_config.topic_prefix}/{topic}", payload, retain=retain
        )

    def stop(self) -> None:
        self.client.disconnect()

    def _set_initial_topics(self) -> None:
        """Set initial state topics."""
        for camera_name, camera in self.config.cameras.items():
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
                "ON" if camera.motion.improve_contrast else "OFF",  # type: ignore[union-attr]
                retain=True,
            )
            self.publish(
                f"{camera_name}/motion_threshold/state",
                camera.motion.threshold,  # type: ignore[union-attr]
                retain=True,
            )
            self.publish(
                f"{camera_name}/motion_contour_area/state",
                camera.motion.contour_area,  # type: ignore[union-attr]
                retain=True,
            )
            self.publish(
                f"{camera_name}/motion",
                "OFF",
                retain=False,
            )

        self.publish("available", "online", retain=True)

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
        rc: mqtt.ReasonCodes,
    ) -> None:
        """Mqtt connection callback."""
        threading.current_thread().name = "mqtt"
        if rc != 0:
            if rc == 3:
                logger.error(
                    "Unable to connect to MQTT server: MQTT Server unavailable"
                )
            elif rc == 4:
                logger.error(
                    "Unable to connect to MQTT server: MQTT Bad username or password"
                )
            elif rc == 5:
                logger.error("Unable to connect to MQTT server: MQTT Not authorized")
            else:
                logger.error(
                    "Unable to connect to MQTT server: Connection refused. Error code: "
                    + str(rc)
                )

        self.connected = True
        logger.debug("MQTT connected")
        client.subscribe(f"{self.mqtt_config.topic_prefix}/#")
        self._set_initial_topics()

    def _on_disconnect(
        self, client: mqtt.Client, userdata: Any, flags: Any, rc: mqtt
    ) -> None:
        """Mqtt disconnection callback."""
        self.connected = False
        logger.error("MQTT disconnected")

    def _start(self) -> None:
        """Start mqtt client."""
        self.client = mqtt.Client(client_id=self.mqtt_config.client_id)
        self.client.on_connect = self._on_connect
        self.client.will_set(
            self.mqtt_config.topic_prefix + "/available",
            payload="offline",
            qos=1,
            retain=True,
        )

        # register callbacks
        callback_types = [
            "recordings",
            "snapshots",
            "detect",
            "motion",
            "improve_contrast",
            "motion_threshold",
            "motion_contour_area",
        ]

        for name in self.config.cameras.keys():
            for callback in callback_types:
                # We need to pre-clear existing set topics because in previous
                # versions the webUI retained on the /set topic but this is
                # no longer the case.
                self.client.publish(
                    f"{self.mqtt_config.topic_prefix}/{name}/{callback}/set",
                    None,
                    retain=True,
                )
                self.client.message_callback_add(
                    f"{self.mqtt_config.topic_prefix}/{name}/{callback}/set",
                    self.on_mqtt_command,
                )

            if self.config.cameras[name].onvif.host:
                self.client.message_callback_add(
                    f"{self.mqtt_config.topic_prefix}/{name}/ptz",
                    self.on_mqtt_command,
                )

        self.client.message_callback_add(
            f"{self.mqtt_config.topic_prefix}/restart", self.on_mqtt_command
        )

        if not self.mqtt_config.tls_ca_certs is None:
            if (
                not self.mqtt_config.tls_client_cert is None
                and not self.mqtt_config.tls_client_key is None
            ):
                self.client.tls_set(
                    self.mqtt_config.tls_ca_certs,
                    self.mqtt_config.tls_client_cert,
                    self.mqtt_config.tls_client_key,
                )
            else:
                self.client.tls_set(self.mqtt_config.tls_ca_certs)
        if not self.mqtt_config.tls_insecure is None:
            self.client.tls_insecure_set(self.mqtt_config.tls_insecure)
        if not self.mqtt_config.user is None:
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
