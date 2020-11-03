import paho.mqtt.client as mqtt

from frigate.config import MqttConfig

def create_mqtt_client(config: MqttConfig):
    client = mqtt.Client(client_id=config.client_id)
    def on_connect(client, userdata, flags, rc):
        # TODO: use logging library
        print("On connect called")
        if rc != 0:
            if rc == 3:
                print ("MQTT Server unavailable")
            elif rc == 4:
                print ("MQTT Bad username or password")
            elif rc == 5:
                print ("MQTT Not authorized")
            else:
                print ("Unable to connect to MQTT: Connection refused. Error code: " + str(rc))
        client.publish(config.topic_prefix+'/available', 'online', retain=True)       
    client.on_connect = on_connect
    client.will_set(config.topic_prefix+'/available', payload='offline', qos=1, retain=True)
    if not config.user is None:
        client.username_pw_set(config.user, password=config.password)
    client.connect(config.host, config.port, 60)
    client.loop_start()
    return client