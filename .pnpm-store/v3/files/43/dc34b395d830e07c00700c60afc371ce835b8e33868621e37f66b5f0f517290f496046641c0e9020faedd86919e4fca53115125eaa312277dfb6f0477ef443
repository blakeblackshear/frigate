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
var WebSocketHandler_exports = {};
__export(WebSocketHandler_exports, {
  WebSocketHandler: () => WebSocketHandler,
  kEmitter: () => kEmitter,
  kSender: () => kSender
});
module.exports = __toCommonJS(WebSocketHandler_exports);
var import_strict_event_emitter = require("strict-event-emitter");
var import_interceptors = require("@mswjs/interceptors");
var import_matchRequestUrl = require("../utils/matching/matchRequestUrl");
var import_getCallFrame = require("../utils/internal/getCallFrame");
const kEmitter = Symbol("kEmitter");
const kSender = Symbol("kSender");
const kStopPropagationPatched = Symbol("kStopPropagationPatched");
const KOnStopPropagation = Symbol("KOnStopPropagation");
class WebSocketHandler {
  constructor(url) {
    this.url = url;
    this.id = (0, import_interceptors.createRequestId)();
    this[kEmitter] = new import_strict_event_emitter.Emitter();
    this.callFrame = (0, import_getCallFrame.getCallFrame)(new Error());
    this.__kind = "EventHandler";
  }
  __kind;
  id;
  callFrame;
  [kEmitter];
  parse(args) {
    const clientUrl = new URL(args.url);
    clientUrl.pathname = clientUrl.pathname.replace(/^\/socket.io\//, "/");
    const match = (0, import_matchRequestUrl.matchRequestUrl)(
      clientUrl,
      this.url,
      args.resolutionContext?.baseUrl
    );
    return {
      match
    };
  }
  predicate(args) {
    return args.parsedResult.match.matches;
  }
  async run(connection, resolutionContext) {
    const parsedResult = this.parse({
      url: connection.client.url,
      resolutionContext
    });
    if (!this.predicate({ url: connection.client.url, parsedResult })) {
      return false;
    }
    const resolvedConnection = {
      ...connection,
      params: parsedResult.match.params || {}
    };
    return this.connect(resolvedConnection);
  }
  connect(connection) {
    connection.client.addEventListener(
      "message",
      createStopPropagationListener(this)
    );
    connection.client.addEventListener(
      "close",
      createStopPropagationListener(this)
    );
    connection.server.addEventListener(
      "open",
      createStopPropagationListener(this)
    );
    connection.server.addEventListener(
      "message",
      createStopPropagationListener(this)
    );
    connection.server.addEventListener(
      "error",
      createStopPropagationListener(this)
    );
    connection.server.addEventListener(
      "close",
      createStopPropagationListener(this)
    );
    return this[kEmitter].emit("connection", connection);
  }
}
function createStopPropagationListener(handler) {
  return function stopPropagationListener(event) {
    const propagationStoppedAt = Reflect.get(event, "kPropagationStoppedAt");
    if (propagationStoppedAt && handler.id !== propagationStoppedAt) {
      event.stopImmediatePropagation();
      return;
    }
    Object.defineProperty(event, KOnStopPropagation, {
      value() {
        Object.defineProperty(event, "kPropagationStoppedAt", {
          value: handler.id
        });
      },
      configurable: true
    });
    if (!Reflect.get(event, kStopPropagationPatched)) {
      event.stopPropagation = new Proxy(event.stopPropagation, {
        apply: (target, thisArg, args) => {
          Reflect.get(event, KOnStopPropagation)?.call(handler);
          return Reflect.apply(target, thisArg, args);
        }
      });
      Object.defineProperty(event, kStopPropagationPatched, {
        value: true,
        // If something else attempts to redefine this, throw.
        configurable: false
      });
    }
  };
}
//# sourceMappingURL=WebSocketHandler.js.map