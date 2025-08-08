"""Websocket communicator."""

import errno
import json
import logging
import threading
from typing import Any, Callable
from wsgiref.simple_server import make_server

from ws4py.server.wsgirefserver import (
    WebSocketWSGIHandler,
    WebSocketWSGIRequestHandler,
    WSGIServer,
)
from ws4py.server.wsgiutils import WebSocketWSGIApplication
from ws4py.websocket import WebSocket as WebSocket_

from frigate.comms.base_communicator import Communicator
from frigate.config import FrigateConfig

logger = logging.getLogger(__name__)


class WebSocket(WebSocket_):  # type: ignore[misc]
    def unhandled_error(self, error: Any) -> None:
        """
        Handles the unfriendly socket closures on the server side
        without showing a confusing error message
        """
        if hasattr(error, "errno") and error.errno == errno.ECONNRESET:
            pass
        else:
            logging.getLogger("ws4py").exception("Failed to receive data")


class WebSocketClient(Communicator):
    """Frigate wrapper for ws client."""

    def __init__(self, config: FrigateConfig) -> None:
        self.config = config
        self.websocket_server: WSGIServer | None = None

    def subscribe(self, receiver: Callable) -> None:
        self._dispatcher = receiver
        self.start()

    def start(self) -> None:
        """Start the websocket client."""

        class _WebSocketHandler(WebSocket):
            receiver = self._dispatcher

            def received_message(self, message: WebSocket.received_message) -> None:  # type: ignore[name-defined]
                try:
                    json_message = json.loads(message.data.decode("utf-8"))
                    json_message = {
                        "topic": json_message.get("topic"),
                        "payload": json_message.get("payload"),
                    }
                except Exception:
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

    def publish(self, topic: str, payload: Any, _: bool = False) -> None:
        try:
            ws_message = json.dumps(
                {
                    "topic": topic,
                    "payload": payload,
                }
            )
        except Exception:
            # if the payload can't be decoded don't relay to clients
            logger.debug(f"payload for {topic} wasn't text. Skipping...")
            return

        if self.websocket_server is None:
            logger.debug("Skipping message, websocket not connected yet")
            return

        try:
            self.websocket_server.manager.broadcast(ws_message)
        except ConnectionResetError:
            pass

    def stop(self) -> None:
        if self.websocket_server is not None:
            self.websocket_server.manager.close_all()
            self.websocket_server.manager.stop()
            self.websocket_server.manager.join()
            self.websocket_server.shutdown()

        self.websocket_thread.join()
        logger.info("Exiting websocket client...")
