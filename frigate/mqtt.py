import datetime
import json
import logging
import threading
from wsgiref.simple_server import make_server

import paho.mqtt.client as mqtt
from ws4py.server.wsgirefserver import (
    WebSocketWSGIHandler,
    WebSocketWSGIRequestHandler,
    WSGIServer,
)
from ws4py.server.wsgiutils import WebSocketWSGIApplication
from ws4py.websocket import WebSocket

from frigate.config import FrigateConfig
from frigate.types import CameraMetricsTypes
from frigate.util import restart_frigate

logger = logging.getLogger(__name__)


class FrigateMqttClient:
    """Frigate wrapper for mqtt client."""

    def __init__(
        self, config: FrigateConfig, camera_metrics: dict[str, CameraMetricsTypes]
    ) -> None:
        self.config: FrigateConfig = config
        self.mqtt_config = config.mqtt
        self.camera_metrics: dict[str, CameraMetricsTypes] = camera_metrics
        self.client: mqtt.Client = None
        self.connected: bool = False
        self._start()

    def _set_initial_topics(self) -> None:
        """Set initial state topics."""
        for camera_name, camera in self.config.cameras.items():
            self.publish(
                f"{self.mqtt_config.topic_prefix}/{camera_name}/recordings/state",
                "ON" if camera.record.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{self.mqtt_config.topic_prefix}/{camera_name}/snapshots/state",
                "ON" if camera.snapshots.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{self.mqtt_config.topic_prefix}/{camera_name}/detect/state",
                "ON" if camera.detect.enabled else "OFF",
                retain=True,
            )
            self.publish(
                f"{self.mqtt_config.topic_prefix}/{camera_name}/motion/state",
                "ON",
                retain=True,
            )
            self.publish(
                f"{self.mqtt_config.topic_prefix}/{camera_name}/improve_contrast/state",
                "ON" if camera.motion.improve_contrast else "OFF",
                retain=True,
            )
            self.publish(
                f"{self.mqtt_config.topic_prefix}/{camera_name}/motion_threshold/state",
                camera.motion.threshold,
                retain=True,
            )
            self.publish(
                f"{self.mqtt_config.topic_prefix}/{camera_name}/motion_contour_area/state",
                camera.motion.contour_area,
                retain=True,
            )
            self.publish(
                f"{self.mqtt_config.topic_prefix}/{camera_name}/motion",
                "OFF",
                retain=False,
            )

        self.publish(
            self.mqtt_config.topic_prefix + "/available", "online", retain=True
        )

    def on_recordings_command(
        self, client: mqtt.Client, userdata, message: mqtt.MQTTMessage
    ) -> None:
        """Callback for recordings topic."""
        payload = message.payload.decode()
        logger.debug(f"on_recordings_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        record_settings = self.config.cameras[camera_name].record

        if payload == "ON":
            if not record_settings.enabled:
                logger.info(f"Turning on recordings for {camera_name} via mqtt")
                record_settings.enabled = True
        elif payload == "OFF":
            if record_settings.enabled:
                logger.info(f"Turning off recordings for {camera_name} via mqtt")
                record_settings.enabled = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        state_topic = f"{message.topic[:-4]}/state"
        self.publish(state_topic, payload, retain=True)

    def on_snapshots_command(
        self, client: mqtt.Client, userdata, message: mqtt.MQTTMessage
    ) -> None:
        """Callback for snapshots topic."""
        payload = message.payload.decode()
        logger.debug(f"on_snapshots_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        snapshots_settings = self.config.cameras[camera_name].snapshots

        if payload == "ON":
            if not snapshots_settings.enabled:
                logger.info(f"Turning on snapshots for {camera_name} via mqtt")
                snapshots_settings.enabled = True
        elif payload == "OFF":
            if snapshots_settings.enabled:
                logger.info(f"Turning off snapshots for {camera_name} via mqtt")
                snapshots_settings.enabled = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        state_topic = f"{message.topic[:-4]}/state"
        self.publish(state_topic, payload, retain=True)

    def on_detect_command(
        self, client: mqtt.Client, userdata, message: mqtt.MQTTMessage
    ) -> None:
        """Callback for detect topic."""
        payload = message.payload.decode()
        logger.debug(f"on_detect_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        detect_settings = self.config.cameras[camera_name].detect

        if payload == "ON":
            if not self.camera_metrics[camera_name]["detection_enabled"].value:
                logger.info(f"Turning on detection for {camera_name} via mqtt")
                self.camera_metrics[camera_name]["detection_enabled"].value = True
                detect_settings.enabled = True

                if not self.camera_metrics[camera_name]["motion_enabled"].value:
                    logger.info(
                        f"Turning on motion for {camera_name} due to detection being enabled."
                    )
                    self.camera_metrics[camera_name]["motion_enabled"].value = True
                    state_topic = f"{message.topic[:-11]}/motion/state"
                    self.publish(state_topic, payload, retain=True)
        elif payload == "OFF":
            if self.camera_metrics[camera_name]["detection_enabled"].value:
                logger.info(f"Turning off detection for {camera_name} via mqtt")
                self.camera_metrics[camera_name]["detection_enabled"].value = False
                detect_settings.enabled = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        state_topic = f"{message.topic[:-4]}/state"
        self.publish(state_topic, payload, retain=True)

    def on_motion_command(
        self, client: mqtt.Client, userdata, message: mqtt.MQTTMessage
    ) -> None:
        """Callback for motion topic."""
        payload = message.payload.decode()
        logger.debug(f"on_motion_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        if payload == "ON":
            if not self.camera_metrics[camera_name]["motion_enabled"].value:
                logger.info(f"Turning on motion for {camera_name} via mqtt")
                self.camera_metrics[camera_name]["motion_enabled"].value = True
        elif payload == "OFF":
            if self.camera_metrics[camera_name]["detection_enabled"].value:
                logger.error(
                    f"Turning off motion is not allowed when detection is enabled."
                )
                return

            if self.camera_metrics[camera_name]["motion_enabled"].value:
                logger.info(f"Turning off motion for {camera_name} via mqtt")
                self.camera_metrics[camera_name]["motion_enabled"].value = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        state_topic = f"{message.topic[:-4]}/state"
        self.publish(state_topic, payload, retain=True)

    def on_improve_contrast_command(
        self, client: mqtt.Client, userdata, message: mqtt.MQTTMessage
    ) -> None:
        """Callback for improve_contrast topic."""
        payload = message.payload.decode()
        logger.debug(f"on_improve_contrast_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        motion_settings = self.config.cameras[camera_name].motion

        if payload == "ON":
            if not self.camera_metrics[camera_name]["improve_contrast_enabled"].value:
                logger.info(f"Turning on improve contrast for {camera_name} via mqtt")
                self.camera_metrics[camera_name][
                    "improve_contrast_enabled"
                ].value = True
                motion_settings.improve_contrast = True
        elif payload == "OFF":
            if self.camera_metrics[camera_name]["improve_contrast_enabled"].value:
                logger.info(f"Turning off improve contrast for {camera_name} via mqtt")
                self.camera_metrics[camera_name][
                    "improve_contrast_enabled"
                ].value = False
                motion_settings.improve_contrast = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        state_topic = f"{message.topic[:-4]}/state"
        self.publish(state_topic, payload, retain=True)

    def on_motion_threshold_command(
        self, client: mqtt.Client, userdata, message: mqtt.MQTTMessage
    ) -> None:
        """Callback for motion threshold topic."""
        try:
            payload = int(message.payload.decode())
        except ValueError:
            logger.warning(
                f"Received unsupported value at {message.topic}: {message.payload.decode()}"
            )
            return

        logger.debug(f"on_motion_threshold_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        motion_settings = self.config.cameras[camera_name].motion

        logger.info(f"Setting motion threshold for {camera_name} via mqtt: {payload}")
        self.camera_metrics[camera_name]["motion_threshold"].value = payload
        motion_settings.threshold = payload

        state_topic = f"{message.topic[:-4]}/state"
        self.publish(state_topic, payload, retain=True)

    def on_motion_contour_area_command(
        self, client: mqtt.Client, userdata, message: mqtt.MQTTMessage
    ) -> None:
        """Callback for motion contour topic."""
        try:
            payload = int(message.payload.decode())
        except ValueError:
            logger.warning(
                f"Received unsupported value at {message.topic}: {message.payload.decode()}"
            )
            return

        logger.debug(f"on_motion_contour_area_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        motion_settings = self.config.cameras[camera_name].motion

        logger.info(
            f"Setting motion contour area for {camera_name} via mqtt: {payload}"
        )
        self.camera_metrics[camera_name]["motion_contour_area"].value = payload
        motion_settings.contour_area = payload

        state_topic = f"{message.topic[:-4]}/state"
        self.publish(state_topic, payload, retain=True)

    def on_restart_command(
        client: mqtt.Client, userdata, message: mqtt.MQTTMessage
    ) -> None:
        """Callback to restart frigate."""
        restart_frigate()

    def _on_connect(self, client: mqtt.Client, userdata, flags, rc) -> None:
        """Mqtt connection callback."""
        self.connected = True
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

        logger.debug("MQTT connected")
        client.subscribe(f"{self.mqtt_config.topic_prefix}/#")
        self._set_initial_topics()

    def _on_disconnect(self, client: mqtt.Client, userdata, flags, rc) -> None:
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
        for name in self.config.cameras.keys():
            self.client.message_callback_add(
                f"{self.mqtt_config.topic_prefix}/{name}/recordings/set",
                self.on_recordings_command,
            )
            self.client.message_callback_add(
                f"{self.mqtt_config.topic_prefix}/{name}/snapshots/set",
                self.on_snapshots_command,
            )
            self.client.message_callback_add(
                f"{self.mqtt_config.topic_prefix}/{name}/detect/set",
                self.on_detect_command,
            )
            self.client.message_callback_add(
                f"{self.mqtt_config.topic_prefix}/{name}/motion/set",
                self.on_motion_command,
            )
            self.client.message_callback_add(
                f"{self.mqtt_config.topic_prefix}/{name}/improve_contrast/set",
                self.on_improve_contrast_command,
            )
            self.client.message_callback_add(
                f"{self.mqtt_config.topic_prefix}/{name}/motion_threshold/set",
                self.on_motion_threshold_command,
            )
            self.client.message_callback_add(
                f"{self.mqtt_config.topic_prefix}/{name}/motion_contour_area/set",
                self.on_motion_contour_area_command,
            )

        self.client.message_callback_add(
            f"{self.mqtt_config.topic_prefix}/restart", self.on_restart_command
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

    def publish(self, topic: str, payload, retain: bool = False) -> None:
        """Wrapper for publishing when client is in valid state."""
        if not self.connected:
            logger.error(f"Unable to publish to {topic}: client is not connected")
            return

        self.client.publish(topic, payload, retain=retain)

    def add_topic_callback(self, topic: str, callback) -> None:
        self.client.message_callback_add(topic, callback)


class MqttSocketRelay:
    def __init__(self, mqtt_client: FrigateMqttClient, topic_prefix: str):
        self.mqtt_client = mqtt_client
        self.topic_prefix = topic_prefix

    def start(self):
        class MqttWebSocket(WebSocket):
            topic_prefix = self.topic_prefix
            mqtt_client = self.mqtt_client

            def received_message(self, message):
                try:
                    json_message = json.loads(message.data.decode("utf-8"))
                    json_message = {
                        "topic": f"{self.topic_prefix}/{json_message['topic']}",
                        "payload": json_message.get("payload"),
                        "retain": json_message.get("retain", False),
                    }
                except Exception as e:
                    logger.warning("Unable to parse websocket message as valid json.")
                    return

                logger.debug(
                    f"Publishing mqtt message from websockets at {json_message['topic']}."
                )
                self.mqtt_client.publish(
                    json_message["topic"],
                    json_message["payload"],
                    retain=json_message["retain"],
                )

        # start a websocket server on 5002
        WebSocketWSGIHandler.http_version = "1.1"
        self.websocket_server = make_server(
            "127.0.0.1",
            5002,
            server_class=WSGIServer,
            handler_class=WebSocketWSGIRequestHandler,
            app=WebSocketWSGIApplication(handler_cls=MqttWebSocket),
        )
        self.websocket_server.initialize_websockets_manager()
        self.websocket_thread = threading.Thread(
            target=self.websocket_server.serve_forever
        )

        def send(client, userdata, message):
            """Sends mqtt messages to clients."""
            try:
                logger.debug(f"Received mqtt message on {message.topic}.")
                ws_message = json.dumps(
                    {
                        "topic": message.topic.replace(f"{self.topic_prefix}/", ""),
                        "payload": message.payload.decode(),
                    }
                )
            except Exception as e:
                # if the payload can't be decoded don't relay to clients
                logger.debug(
                    f"MQTT payload for {message.topic} wasn't text. Skipping..."
                )
                return

            self.websocket_server.manager.broadcast(ws_message)

        self.mqtt_client.add_topic_callback(f"{self.topic_prefix}/#", send)

        self.websocket_thread.start()

    def stop(self):
        self.websocket_server.manager.close_all()
        self.websocket_server.manager.stop()
        self.websocket_server.manager.join()
        self.websocket_server.shutdown()
        self.websocket_thread.join()
