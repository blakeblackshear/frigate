import logging
import threading

import paho.mqtt.client as mqtt

from frigate.config import FrigateConfig

logger = logging.getLogger(__name__)

def create_mqtt_client(config: FrigateConfig):
    mqtt_config = config.mqtt

    def on_clips_command(client, userdata, message):
        payload = message.payload.decode()
        logger.debug(f"on_clips_toggle: {message.topic} {payload}")

        camera_name = message.topic.split('/')[-3]
        command = message.topic.split('/')[-1]

        if payload == 'ON':
            config.cameras[camera_name].clips._enabled = True
        elif payload == 'OFF':
            config.cameras[camera_name].clips._enabled = False
        else:
            logger.warning(f"Received unsupported value at {message.topic}: {payload}")

        if command == "set":
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
        client.publish(mqtt_config.topic_prefix+'/available', 'online', retain=True)   

    client = mqtt.Client(client_id=mqtt_config.client_id)    
    client.on_connect = on_connect
    client.will_set(mqtt_config.topic_prefix+'/available', payload='offline', qos=1, retain=True)
    
    # register callbacks
    for name in config.cameras.keys():
        clips_topic = f"{mqtt_config.topic_prefix}/{name}/clips/#"
        client.message_callback_add(clips_topic, on_clips_command)

    if not mqtt_config.user is None:
        client.username_pw_set(mqtt_config.user, password=mqtt_config.password)
    try:
        client.connect(mqtt_config.host, mqtt_config.port, 60)
    except Exception as e:
        logger.error(f"Unable to connect to MQTT server: {e}")
        raise

    client.loop_start()

    clips_topic = f"{mqtt_config.topic_prefix}/+/clips/#"
    client.subscribe(clips_topic)

    return client
