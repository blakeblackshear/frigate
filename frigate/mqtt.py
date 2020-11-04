import logging
import paho.mqtt.client as mqtt
import threading

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
    client.connect(config.host, config.port, 60)
    client.loop_start()
    return client