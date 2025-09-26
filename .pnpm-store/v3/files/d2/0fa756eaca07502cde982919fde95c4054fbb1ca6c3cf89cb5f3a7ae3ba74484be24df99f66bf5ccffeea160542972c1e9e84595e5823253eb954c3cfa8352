import { Emitter } from "strict-event-emitter";
import { createRequestId } from "@mswjs/interceptors";
import {
  matchRequestUrl
} from '../utils/matching/matchRequestUrl.mjs';
import { getCallFrame } from '../utils/internal/getCallFrame.mjs';
const kEmitter = Symbol("kEmitter");
const kSender = Symbol("kSender");
const kStopPropagationPatched = Symbol("kStopPropagationPatched");
const KOnStopPropagation = Symbol("KOnStopPropagation");
class WebSocketHandler {
  constructor(url) {
    this.url = url;
    this.id = createRequestId();
    this[kEmitter] = new Emitter();
    this.callFrame = getCallFrame(new Error());
    this.__kind = "EventHandler";
  }
  __kind;
  id;
  callFrame;
  [kEmitter];
  parse(args) {
    const clientUrl = new URL(args.url);
    clientUrl.pathname = clientUrl.pathname.replace(/^\/socket.io\//, "/");
    const match = matchRequestUrl(
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
export {
  WebSocketHandler,
  kEmitter,
  kSender
};
//# sourceMappingURL=WebSocketHandler.mjs.map