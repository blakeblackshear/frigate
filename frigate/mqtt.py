import logging
import threading

import paho.mqtt.client as mqtt

from frigate.config import MqttConfig

logger = logging.getLogger(__name__)

def create_mqtt_client(config: MqttConfig):
    client = mqtt.Client(client_id=config.client_id)
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
        client.publish(config.topic_prefix+'/available', 'online', retain=True)       
    client.on_connect = on_connect
    client.will_set(config.topic_prefix+'/available', payload='offline', qos=1, retain=True)
    if not config.user is None:
        client.username_pw_set(config.user, password=config.password)
    try:
        client.connect(config.host, config.port, 60)
    except Exception as e:
        logger.error(f"Unable to connect to MQTT server: {e}")
        raise
    client.loop_start()
    return client
