"""Websocket communicator."""

from ws4py.server.wsgirefserver import (
    WebSocketWSGIHandler,
    WebSocketWSGIRequestHandler,
    WSGIServer,
)

from frigate.communication.dispatcher import Communicator

class MqttSocketRelay(Communicator):
    def __init__(self, topic_prefix: str):
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