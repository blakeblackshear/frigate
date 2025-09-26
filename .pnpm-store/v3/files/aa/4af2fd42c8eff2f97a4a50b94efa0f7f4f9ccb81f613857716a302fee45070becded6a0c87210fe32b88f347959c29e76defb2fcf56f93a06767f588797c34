import { invariant } from "outvariant";
import {
  WebSocketHandler,
  kEmitter
} from './handlers/WebSocketHandler.mjs';
import { isPath } from './utils/matching/matchRequestUrl.mjs';
import { WebSocketClientManager } from './ws/WebSocketClientManager.mjs';
function isBroadcastChannelWithUnref(channel) {
  return typeof Reflect.get(channel, "unref") !== "undefined";
}
const webSocketChannel = new BroadcastChannel("msw:websocket-client-manager");
if (isBroadcastChannelWithUnref(webSocketChannel)) {
  webSocketChannel.unref();
}
function createWebSocketLinkHandler(url) {
  invariant(url, "Expected a WebSocket server URL but got undefined");
  invariant(
    isPath(url),
    "Expected a WebSocket server URL to be a valid path but got %s",
    typeof url
  );
  const clientManager = new WebSocketClientManager(webSocketChannel);
  return {
    get clients() {
      return clientManager.clients;
    },
    addEventListener(event, listener) {
      const handler = new WebSocketHandler(url);
      handler[kEmitter].on("connection", async ({ client }) => {
        await clientManager.addConnection(client);
      });
      handler[kEmitter].on(event, listener);
      return handler;
    },
    broadcast(data) {
      this.broadcastExcept([], data);
    },
    broadcastExcept(clients, data) {
      const ignoreClients = Array.prototype.concat(clients).map((client) => client.id);
      clientManager.clients.forEach((otherClient) => {
        if (!ignoreClients.includes(otherClient.id)) {
          otherClient.send(data);
        }
      });
    }
  };
}
const ws = {
  link: createWebSocketLinkHandler
};
export {
  ws
};
//# sourceMappingURL=ws.mjs.map