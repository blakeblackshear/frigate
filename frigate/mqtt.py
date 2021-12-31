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
from frigate.util import restart_frigate

logger = logging.getLogger(__name__)


def create_mqtt_client(config: FrigateConfig, camera_metrics):
    mqtt_config = config.mqtt

    def on_recordings_command(client, userdata, message):
        payload = message.payload.decode()
        logger.debug(f"on_recordings_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        record_settings = config.cameras[camera_name].record

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
        client.publish(state_topic, payload, retain=True)

    def on_snapshots_command(client, userdata, message):
        payload = message.payload.decode()
        logger.debug(f"on_snapshots_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        snapshots_settings = config.cameras[camera_name].snapshots

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
        client.publish(state_topic, payload, retain=True)

    def on_detect_command(client, userdata, message):
        payload = message.payload.decode()
        logger.debug(f"on_detect_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        detect_settings = config.cameras[camera_name].detect

        if payload == "ON":
            if not camera_metrics[camera_name]["detection_enabled"].value:
                logger.info(f"Turning on detection for {camera_name} via mqtt")
                camera_metrics[camera_name]["detection_enabled"].value = True
                detect_settings.enabled = True
        elif payload == "OFF":
            if camera_metrics[camera_name]["detection_enabled"].value:
                logger.info(f"Turning off detection for {camera_name} via mqtt")
                camera_metrics[camera_name]["detection_enabled"].value = False
                detect_settings.enabled = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        state_topic = f"{message.topic[:-4]}/state"
        client.publish(state_topic, payload, retain=True)

    def on_restart_command(client, userdata, message):
        restart_frigate()

    def on_connect(client, userdata, flags, rc):
        threading.current_thread().name = "mqtt"
        if rc != 0:
            if rc == 3:
                logger.error("Unable to connect to MQTT server: MQTT Server unavailable")
            elif rc == 4:
                logger.error("Unable to connect to MQTT server: MQTT Bad username or password")
            elif rc == 5:
                logger.error("Unable to connect to MQTT server: MQTT Not authorized")
            else:
                logger.error(
                    "Unable to connect to MQTT server: Connection refused. Error code: "
                    + str(rc)
                )

        logger.debug("MQTT connected")
        client.subscribe(f"{mqtt_config.topic_prefix}/#")
        client.publish(mqtt_config.topic_prefix + "/available", "online", retain=True)

    client = mqtt.Client(client_id=mqtt_config.client_id)
    client.on_connect = on_connect
    client.will_set(
        mqtt_config.topic_prefix + "/available", payload="offline", qos=1, retain=True
    )

    # register callbacks
    for name in config.cameras.keys():
        client.message_callback_add(
            f"{mqtt_config.topic_prefix}/{name}/recordings/set", on_recordings_command
        )
        client.message_callback_add(
            f"{mqtt_config.topic_prefix}/{name}/snapshots/set", on_snapshots_command
        )
        client.message_callback_add(
            f"{mqtt_config.topic_prefix}/{name}/detect/set", on_detect_command
        )

    client.message_callback_add(
        f"{mqtt_config.topic_prefix}/restart", on_restart_command
    )

    if not mqtt_config.tls_ca_certs is None:
        if (
            not mqtt_config.tls_client_cert is None
            and not mqtt_config.tls_client_key is None
        ):
            client.tls_set(
                mqtt_config.tls_ca_certs,
                mqtt_config.tls_client_cert,
                mqtt_config.tls_client_key,
            )
        else:
            client.tls_set(mqtt_config.tls_ca_certs)
    if not mqtt_config.tls_insecure is None:
        client.tls_insecure_set(mqtt_config.tls_insecure)
    if not mqtt_config.user is None:
        client.username_pw_set(mqtt_config.user, password=mqtt_config.password)
    try:
        client.connect(mqtt_config.host, mqtt_config.port, 60)
    except Exception as e:
        logger.error(f"Unable to connect to MQTT server: {e}")
        raise

    client.loop_start()

    for name in config.cameras.keys():
        client.publish(
            f"{mqtt_config.topic_prefix}/{name}/recordings/state",
            "ON" if config.cameras[name].record.enabled else "OFF",
            retain=True,
        )
        client.publish(
            f"{mqtt_config.topic_prefix}/{name}/snapshots/state",
            "ON" if config.cameras[name].snapshots.enabled else "OFF",
            retain=True,
        )
        client.publish(
            f"{mqtt_config.topic_prefix}/{name}/detect/state",
            "ON" if config.cameras[name].detect.enabled else "OFF",
            retain=True,
        )

    return client


class MqttSocketRelay:
    def __init__(self, mqtt_client, topic_prefix):
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

        self.mqtt_client.message_callback_add(f"{self.topic_prefix}/#", send)

        self.websocket_thread.start()

    def stop(self):
        self.websocket_server.manager.close_all()
        self.websocket_server.manager.stop()
        self.websocket_server.manager.join()
        self.websocket_server.shutdown()
        self.websocket_thread.join()
