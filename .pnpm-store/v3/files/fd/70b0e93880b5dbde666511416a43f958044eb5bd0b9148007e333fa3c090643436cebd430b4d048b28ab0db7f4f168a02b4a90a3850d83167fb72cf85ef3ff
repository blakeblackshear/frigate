"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var ws_exports = {};
__export(ws_exports, {
  ws: () => ws
});
module.exports = __toCommonJS(ws_exports);
var import_outvariant = require("outvariant");
var import_WebSocketHandler = require("./handlers/WebSocketHandler");
var import_matchRequestUrl = require("./utils/matching/matchRequestUrl");
var import_WebSocketClientManager = require("./ws/WebSocketClientManager");
function isBroadcastChannelWithUnref(channel) {
  return typeof Reflect.get(channel, "unref") !== "undefined";
}
const webSocketChannel = new BroadcastChannel("msw:websocket-client-manager");
if (isBroadcastChannelWithUnref(webSocketChannel)) {
  webSocketChannel.unref();
}
function createWebSocketLinkHandler(url) {
  (0, import_outvariant.invariant)(url, "Expected a WebSocket server URL but got undefined");
  (0, import_outvariant.invariant)(
    (0, import_matchRequestUrl.isPath)(url),
    "Expected a WebSocket server URL to be a valid path but got %s",
    typeof url
  );
  const clientManager = new import_WebSocketClientManager.WebSocketClientManager(webSocketChannel);
  return {
    get clients() {
      return clientManager.clients;
    },
    addEventListener(event, listener) {
      const handler = new import_WebSocketHandler.WebSocketHandler(url);
      handler[import_WebSocketHandler.kEmitter].on("connection", async ({ client }) => {
        await clientManager.addConnection(client);
      });
      handler[import_WebSocketHandler.kEmitter].on(event, listener);
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
//# sourceMappingURL=ws.js.map