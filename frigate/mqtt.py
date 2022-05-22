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

from frigate.config import BirdseyeModeEnum, FrigateConfig
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

                if not camera_metrics[camera_name]["motion_enabled"].value:
                    logger.info(
                        f"Turning on motion for {camera_name} due to detection being enabled."
                    )
                    camera_metrics[camera_name]["motion_enabled"].value = True
        elif payload == "OFF":
            if camera_metrics[camera_name]["detection_enabled"].value:
                logger.info(f"Turning off detection for {camera_name} via mqtt")
                camera_metrics[camera_name]["detection_enabled"].value = False
                detect_settings.enabled = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        state_topic = f"{message.topic[:-4]}/state"
        client.publish(state_topic, payload, retain=True)

    def on_motion_command(client, userdata, message):
        payload = message.payload.decode()
        logger.debug(f"on_motion_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        if payload == "ON":
            if not camera_metrics[camera_name]["motion_enabled"].value:
                logger.info(f"Turning on motion for {camera_name} via mqtt")
                camera_metrics[camera_name]["motion_enabled"].value = True
        elif payload == "OFF":
            if camera_metrics[camera_name]["detection_enabled"].value:
                logger.error(
                    f"Turning off motion is not allowed when detection is enabled."
                )
                return

            if camera_metrics[camera_name]["motion_enabled"].value:
                logger.info(f"Turning off motion for {camera_name} via mqtt")
                camera_metrics[camera_name]["motion_enabled"].value = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        state_topic = f"{message.topic[:-4]}/state"
        client.publish(state_topic, payload, retain=True)

    def on_improve_contrast_command(client, userdata, message):
        payload = message.payload.decode()
        logger.debug(f"on_improve_contrast_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        motion_settings = config.cameras[camera_name].motion

        if payload == "ON":
            if not camera_metrics[camera_name]["improve_contrast_enabled"].value:
                logger.info(f"Turning on improve contrast for {camera_name} via mqtt")
                camera_metrics[camera_name]["improve_contrast_enabled"].value = True
                motion_settings.improve_contrast = True
        elif payload == "OFF":
            if camera_metrics[camera_name]["improve_contrast_enabled"].value:
                logger.info(f"Turning off improve contrast for {camera_name} via mqtt")
                camera_metrics[camera_name]["improve_contrast_enabled"].value = False
                motion_settings.improve_contrast = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        state_topic = f"{message.topic[:-4]}/state"
        client.publish(state_topic, payload, retain=True)

    def on_motion_threshold_command(client, userdata, message):
        try:
            payload = int(message.payload.decode())
        except ValueError:
            logger.warning(
                f"Received unsupported value at {message.topic}: {message.payload.decode()}"
            )
            return

        logger.debug(f"on_motion_threshold_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        motion_settings = config.cameras[camera_name].motion

        logger.info(f"Setting motion threshold for {camera_name} via mqtt: {payload}")
        camera_metrics[camera_name]["motion_threshold"].value = payload
        motion_settings.threshold = payload
        state_topic = f"{message.topic[:-4]}/state"
        client.publish(state_topic, payload, retain=True)

    def on_motion_contour_area_command(client, userdata, message):
        try:
            payload = int(message.payload.decode())
        except ValueError:
            logger.warning(
                f"Received unsupported value at {message.topic}: {message.payload.decode()}"
            )
            return

        logger.debug(f"on_motion_contour_area_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        motion_settings = config.cameras[camera_name].motion

        logger.info(
            f"Setting motion contour area for {camera_name} via mqtt: {payload}"
        )
        camera_metrics[camera_name]["motion_contour_area"].value = payload
        motion_settings.contour_area = payload

    def on_birdseye_command(client, userdata, message):
        payload = message.payload.decode()
        logger.debug(f"on_birdseye_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        birdseye_settings = config.cameras[camera_name].birdseye

        if payload == "ON":
            if not camera_metrics[camera_name]["birdseye_enabled"].value:
                logger.info(f"Turning on birdseye for {camera_name} via mqtt")
                camera_metrics[camera_name]["birdseye_enabled"].value = True
                birdseye_settings.enabled = True
        elif payload == "OFF":
            if camera_metrics[camera_name]["birdseye_enabled"].value:
                logger.info(f"Turning off birdseye for {camera_name} via mqtt")
                camera_metrics[camera_name]["birdseye_enabled"].value = False
                birdseye_settings.enabled = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

    def on_birdseye_mode_command(client, userdata, message):
        payload = message.payload.decode()
        logger.debug(f"on_birdseye_mode_toggle: {message.topic} {payload}")

        camera_name = message.topic.split("/")[-3]

        birdseye_settings = config.cameras[camera_name].birdseye

        if payload == BirdseyeModeEnum.continuous:
            if camera_metrics[camera_name]["birdseye_mode"].value != BirdseyeModeEnum.continuous:
                logger.info(f"Setting birdseye mode for {camera_name} to {payload} via mqtt")
                camera_metrics[camera_name]["birdseye_mode"].value = BirdseyeModeEnum.continuous
                birdseye_settings.mode = BirdseyeModeEnum.continuous
        elif payload == BirdseyeModeEnum.motion:
            if camera_metrics[camera_name]["birdseye_mode"].value != BirdseyeModeEnum.motion:
                logger.info(f"Setting birdseye mode for {camera_name} to {payload} via mqtt")
                camera_metrics[camera_name]["birdseye_mode"].value = BirdseyeModeEnum.motion
                birdseye_settings.mode = BirdseyeModeEnum.motion
        elif payload == BirdseyeModeEnum.objects:
            if camera_metrics[camera_name]["birdseye_mode"].value != BirdseyeModeEnum.objects:
                logger.info(f"Setting birdseye mode for {camera_name} to {payload} via mqtt")
                camera_metrics[camera_name]["birdseye_mode"].value = BirdseyeModeEnum.objects
                birdseye_settings.mode = BirdseyeModeEnum.objects
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
            f"{mqtt_config.topic_prefix}/{name}/motion/set", on_motion_command
        )
        client.message_callback_add(
            f"{mqtt_config.topic_prefix}/{name}/improve_contrast/set",
            on_improve_contrast_command,
        )
        client.message_callback_add(
<<<<<<< HEAD
            f"{mqtt_config.topic_prefix}/{name}/motion_threshold/set",
            on_motion_threshold_command,
        )
        client.message_callback_add(
            f"{mqtt_config.topic_prefix}/{name}/motion_contour_area/set",
            on_motion_contour_area_command,
=======
            f"{mqtt_config.topic_prefix}/{name}/birdseye/set",
            on_birdseye_command,
        )
        client.message_callback_add(
            f"{mqtt_config.topic_prefix}/{name}/birdseye/mode/set",
            on_birdseye_mode_command,
>>>>>>> f223cd0 (Add mqtt topics)
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
        client.publish(
            f"{mqtt_config.topic_prefix}/{name}/motion/state",
            "ON",
            retain=True,
        )
        client.publish(
            f"{mqtt_config.topic_prefix}/{name}/improve_contrast/state",
            "ON" if config.cameras[name].motion.improve_contrast else "OFF",
            retain=True,
        )
        client.publish(
            f"{mqtt_config.topic_prefix}/{name}/motion_threshold/state",
            config.cameras[name].motion.threshold,
            retain=True,
        )
        client.publish(
            f"{mqtt_config.topic_prefix}/{name}/motion_contour_area/state",
            config.cameras[name].motion.contour_area,
            retain=True,
        )
        client.publish(
            f"{mqtt_config.topic_prefix}/{name}/motion",
            "OFF",
            retain=False,
        )
            f"{mqtt_config.topic_prefix}/{name}/birdseye/state",
            "ON" if config.cameras[name].birdseye.enabled else "OFF",
            retain=True,
        )
        client.publish(
            f"{mqtt_config.topic_prefix}/{name}/birdseye/mode",
            config.cameras[name].birdseye.mode,
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
