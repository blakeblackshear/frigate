import logging
import threading

import paho.mqtt.client as mqtt

from frigate.config import FrigateConfig

logger = logging.getLogger(__name__)

def create_mqtt_client(config: FrigateConfig, camera_metrics):
    mqtt_config = config.mqtt

    def on_clips_command(client, userdata, message):
        payload = message.payload.decode()
        logger.debug(f"on_clips_toggle: {message.topic} {payload}")

        camera_name = message.topic.split('/')[-3]

        clips_settings = config.cameras[camera_name].clips

        if payload == 'ON':
            if not clips_settings.enabled:
                logger.info(f"Turning on clips for {camera_name} via mqtt")
                clips_settings._enabled = True
        elif payload == 'OFF':
            if clips_settings.enabled:
                logger.info(f"Turning off clips for {camera_name} via mqtt")
                clips_settings._enabled = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        state_topic = f"{message.topic[:-4]}/state"
        client.publish(state_topic, payload, retain=True)

    def on_snapshots_command(client, userdata, message):
        payload = message.payload.decode()
        logger.debug(f"on_snapshots_toggle: {message.topic} {payload}")

        camera_name = message.topic.split('/')[-3]

        snapshots_settings = config.cameras[camera_name].snapshots

        if payload == 'ON':
            if not snapshots_settings.enabled:
                logger.info(f"Turning on snapshots for {camera_name} via mqtt")
                snapshots_settings._enabled = True
        elif payload == 'OFF':
            if snapshots_settings.enabled:
                logger.info(f"Turning off snapshots for {camera_name} via mqtt")
                snapshots_settings._enabled = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        state_topic = f"{message.topic[:-4]}/state"
        client.publish(state_topic, payload, retain=True)
    
    def on_detect_command(client, userdata, message):
        payload = message.payload.decode()
        logger.debug(f"on_detect_toggle: {message.topic} {payload}")

        camera_name = message.topic.split('/')[-3]

        detect_settings = config.cameras[camera_name].detect

        if payload == 'ON':
            if not camera_metrics[camera_name]["detection_enabled"].value:
                logger.info(f"Turning on detection for {camera_name} via mqtt")
                camera_metrics[camera_name]["detection_enabled"].value = True
                detect_settings._enabled = True
        elif payload == 'OFF':
            if camera_metrics[camera_name]["detection_enabled"].value:
                logger.info(f"Turning off detection for {camera_name} via mqtt")
                camera_metrics[camera_name]["detection_enabled"].value = False
                detect_settings._enabled = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        state_topic = f"{message.topic[:-4]}/state"
        client.publish(state_topic, payload, retain=True)

    def on_connect(client, userdata, flags, rc):
        threading.current_thread().name = "mqtt"
        if rc != 0:
            if rc == 3:
                logger.error("MQTT Server unavailable")
            elif rc == 4:
                logger.error("MQTT Bad username or password")
            elif rc == 5:
                logger.error("MQTT Not authorized")
            else:
                logger.error("Unable to connect to MQTT: Connection refused. Error code: " + str(rc))
            
        logger.info("MQTT connected")
        client.subscribe(f"{mqtt_config.topic_prefix}/#")
        client.publish(mqtt_config.topic_prefix+'/available', 'online', retain=True)   

    client = mqtt.Client(client_id=mqtt_config.client_id)    
    client.on_connect = on_connect
    client.will_set(mqtt_config.topic_prefix+'/available', payload='offline', qos=1, retain=True)
    
    # register callbacks
    for name in config.cameras.keys():
        client.message_callback_add(f"{mqtt_config.topic_prefix}/{name}/clips/set", on_clips_command)
        client.message_callback_add(f"{mqtt_config.topic_prefix}/{name}/snapshots/set", on_snapshots_command)
        client.message_callback_add(f"{mqtt_config.topic_prefix}/{name}/detect/set", on_detect_command)

    if not mqtt_config.tls_ca_certs is None:
        client.tls_set(mqtt_config.tls_ca_certs)
    if not mqtt_config.tls_insecure_set is None:
        client.tls_insecure_set(mqtt_config.tls_insecure_set)
    if not mqtt_config.user is None:
        client.username_pw_set(mqtt_config.user, password=mqtt_config.password)
    try:
        client.connect(mqtt_config.host, mqtt_config.port, 60)
    except Exception as e:
        logger.error(f"Unable to connect to MQTT server: {e}")
        raise

    client.loop_start()

    for name in config.cameras.keys():
        client.publish(f"{mqtt_config.topic_prefix}/{name}/clips/state", 'ON' if config.cameras[name].clips.enabled else 'OFF', retain=True)
        client.publish(f"{mqtt_config.topic_prefix}/{name}/snapshots/state", 'ON' if config.cameras[name].snapshots.enabled else 'OFF', retain=True)
        client.publish(f"{mqtt_config.topic_prefix}/{name}/detect/state", 'ON' if config.cameras[name].detect.enabled else 'OFF', retain=True)

    client.subscribe(f"{mqtt_config.topic_prefix}/#")

    return client
