"""Websocket communicator."""

import json
import logging
import threading

from typing import Callable

from wsgiref.simple_server import make_server
from ws4py.server.wsgirefserver import (
    WebSocketWSGIHandler,
    WebSocketWSGIRequestHandler,
    WSGIServer,
)
from ws4py.server.wsgiutils import WebSocketWSGIApplication
from ws4py.websocket import WebSocket

from frigate.comms.dispatcher import Communicator
from frigate.config import FrigateConfig


logger = logging.getLogger(__name__)


class WebSocketClient(Communicator):  # type: ignore[misc]
    """Frigate wrapper for ws client."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config = config

    def subscribe(self, receiver: Callable) -> None:
        self._dispatcher = receiver
        self.start()

    def start(self) -> None:
        """Start the websocket client."""

        class _WebSocketHandler(WebSocket):  # type: ignore[misc]
            receiver = self._dispatcher

            def received_message(self, message: WebSocket.received_message) -> None:
                try:
                    json_message = json.loads(message.data.decode("utf-8"))
                    json_message = {
                        "topic": json_message.get("topic"),
                        "payload": json_message.get("payload"),
                    }
                except Exception as e:
                    logger.warning(
                        f"Unable to parse websocket message as valid json: {message.data.decode('utf-8')}"
                    )
                    return

                logger.debug(
                    f"Publishing mqtt message from websockets at {json_message['topic']}."
                )
                self.receiver(
                    json_message["topic"],
                    json_message["payload"],
                )

        # start a websocket server on 5002
        WebSocketWSGIHandler.http_version = "1.1"
        self.websocket_server = make_server(
            "127.0.0.1",
            5002,
            server_class=WSGIServer,
            handler_class=WebSocketWSGIRequestHandler,
            app=WebSocketWSGIApplication(handler_cls=_WebSocketHandler),
        )
        self.websocket_server.initialize_websockets_manager()
        self.websocket_thread = threading.Thread(
            target=self.websocket_server.serve_forever
        )
        self.websocket_thread.start()

    def publish(self, topic: str, payload: str, _: bool) -> None:
        try:
            ws_message = json.dumps(
                {
                    "topic": topic,
                    "payload": payload,
                }
            )
        except Exception as e:
            # if the payload can't be decoded don't relay to clients
            logger.debug(f"payload for {topic} wasn't text. Skipping...")
            return

        self.websocket_server.manager.broadcast(ws_message)

    def stop(self) -> None:
        self.websocket_server.manager.close_all()
        self.websocket_server.manager.stop()
        self.websocket_server.manager.join()
        self.websocket_server.shutdown()
        self.websocket_thread.join()
        logger.info("Exiting websocket client...")
