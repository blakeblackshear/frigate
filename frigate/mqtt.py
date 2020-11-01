import paho.mqtt.client as mqtt

def create_mqtt_client(host: str, port: int, client_id: str, topic_prefix: str, user: str, password: str):
    client = mqtt.Client(client_id=client_id)
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
        client.publish(topic_prefix+'/available', 'online', retain=True)       
    client.on_connect = on_connect
    client.will_set(topic_prefix+'/available', payload='offline', qos=1, retain=True)
    if not user is None:
        client.username_pw_set(user, password=password)
    client.connect(host, port, 60)
    client.loop_start()
    return client