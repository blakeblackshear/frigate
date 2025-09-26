import { Server } from 'mock-socket';
import { diff } from 'jest-diff';

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

class Queue {
  constructor() {
    _defineProperty(this, "pendingItems", []);

    _defineProperty(this, "nextItemResolver", void 0);

    _defineProperty(this, "nextItem", new Promise(done => this.nextItemResolver = done));
  }

  put(item) {
    this.pendingItems.push(item);
    this.nextItemResolver();
    this.nextItem = new Promise(done => this.nextItemResolver = done);
  }

  get() {
    const item = this.pendingItems.shift();

    if (item) {
      // return the next queued item immediately
      return Promise.resolve(item);
    }

    let resolver;
    const nextItemPromise = new Promise(done => resolver = done);
    this.nextItem.then(() => {
      resolver(this.pendingItems.shift());
    });
    return nextItemPromise;
  }

}

/**
 * A simple compatibility method for react's "act".
 * If @testing-library/react is already installed, we just use
 * their implementation - it's complete and has useful warnings.
 * If @testing-library/react is *not* installed, then we just assume
 * that the user is not testing a react application, and use a noop instead.
 */
let act;

try {
  act = require("@testing-library/react").act;
} catch (_) {
  act = callback => {
    callback();
  };
}

var act$1 = act;

const identity = x => x;

class WS {
  static clean() {
    WS.instances.forEach(instance => {
      instance.close();
      instance.messages = [];
    });
    WS.instances = [];
  }

  constructor(url, opts = {}) {
    _defineProperty(this, "server", void 0);

    _defineProperty(this, "serializer", void 0);

    _defineProperty(this, "deserializer", void 0);

    _defineProperty(this, "messages", []);

    _defineProperty(this, "messagesToConsume", new Queue());

    _defineProperty(this, "_isConnected", void 0);

    _defineProperty(this, "_isClosed", void 0);

    WS.instances.push(this);
    const {
      jsonProtocol = false,
      ...serverOptions
    } = opts;
    this.serializer = jsonProtocol ? JSON.stringify : identity;
    this.deserializer = jsonProtocol ? JSON.parse : identity;
    let connectionResolver, closedResolver;
    this._isConnected = new Promise(done => connectionResolver = done);
    this._isClosed = new Promise(done => closedResolver = done);
    this.server = new Server(url, serverOptions);
    this.server.on("close", closedResolver);
    this.server.on("connection", socket => {
      connectionResolver(socket);
      socket.on("message", message => {
        const parsedMessage = this.deserializer(message);
        this.messages.push(parsedMessage);
        this.messagesToConsume.put(parsedMessage);
      });
    });
  }

  get connected() {
    let resolve;
    const connectedPromise = new Promise(done => resolve = done);

    const waitForConnected = async () => {
      await act$1(async () => {
        await this._isConnected;
      });
      resolve(await this._isConnected); // make sure `await act` is really done
    };

    waitForConnected();
    return connectedPromise;
  }

  get closed() {
    let resolve;
    const closedPromise = new Promise(done => resolve = done);

    const waitForclosed = async () => {
      await act$1(async () => {
        await this._isClosed;
      });
      await this._isClosed; // make sure `await act` is really done

      resolve();
    };

    waitForclosed();
    return closedPromise;
  }

  get nextMessage() {
    return this.messagesToConsume.get();
  }

  on(eventName, callback) {
    // @ts-ignore https://github.com/romgain/jest-websocket-mock/issues/26#issuecomment-571579567
    this.server.on(eventName, callback);
  }

  send(message) {
    act$1(() => {
      this.server.emit("message", this.serializer(message));
    });
  }

  close(options) {
    act$1(() => {
      this.server.close(options);
    });
  }

  error(options) {
    act$1(() => {
      this.server.emit("error", null);
    });
    this.server.close(options);
  }

}

_defineProperty(WS, "instances", []);

const WAIT_DELAY = 1000;
const TIMEOUT = Symbol("timoeut");

const makeInvalidWsMessage = function makeInvalidWsMessage(ws, matcher) {
  return this.utils.matcherHint(this.isNot ? `.not.${matcher}` : `.${matcher}`, "WS", "expected") + "\n\n" + `Expected the websocket object to be a valid WS mock.\n` + `Received: ${typeof ws}\n` + `  ${this.utils.printReceived(ws)}`;
};

expect.extend({
  async toReceiveMessage(ws, expected, options) {
    const isWS = ws instanceof WS;

    if (!isWS) {
      return {
        pass: this.isNot,
        // always fail
        message: makeInvalidWsMessage.bind(this, ws, "toReceiveMessage")
      };
    }

    const waitDelay = options?.timeout ?? WAIT_DELAY;
    let timeoutId;
    const messageOrTimeout = await Promise.race([ws.nextMessage, new Promise(resolve => {
      timeoutId = setTimeout(() => resolve(TIMEOUT), waitDelay);
    })]);
    clearTimeout(timeoutId);

    if (messageOrTimeout === TIMEOUT) {
      return {
        pass: this.isNot,
        // always fail
        message: () => this.utils.matcherHint(this.isNot ? ".not.toReceiveMessage" : ".toReceiveMessage", "WS", "expected") + "\n\n" + `Expected the websocket server to receive a message,\n` + `but it didn't receive anything in ${waitDelay}ms.`
      };
    }

    const received = messageOrTimeout;
    const pass = this.equals(received, expected);
    const message = pass ? () => this.utils.matcherHint(".not.toReceiveMessage", "WS", "expected") + "\n\n" + `Expected the next received message to not equal:\n` + `  ${this.utils.printExpected(expected)}\n` + `Received:\n` + `  ${this.utils.printReceived(received)}` : () => {
      const diffString = diff(expected, received, {
        expand: this.expand
      });
      return this.utils.matcherHint(".toReceiveMessage", "WS", "expected") + "\n\n" + `Expected the next received message to equal:\n` + `  ${this.utils.printExpected(expected)}\n` + `Received:\n` + `  ${this.utils.printReceived(received)}\n\n` + `Difference:\n\n${diffString}`;
    };
    return {
      actual: received,
      expected,
      message,
      name: "toReceiveMessage",
      pass
    };
  },

  toHaveReceivedMessages(ws, messages) {
    const isWS = ws instanceof WS;

    if (!isWS) {
      return {
        pass: this.isNot,
        // always fail
        message: makeInvalidWsMessage.bind(this, ws, "toHaveReceivedMessages")
      };
    }

    const received = messages.map(expected => // object comparison to handle JSON protocols
    ws.messages.some(actual => this.equals(actual, expected)));
    const pass = this.isNot ? received.some(Boolean) : received.every(Boolean);
    const message = pass ? () => this.utils.matcherHint(".not.toHaveReceivedMessages", "WS", "expected") + "\n\n" + `Expected the WS server to not have received the following messages:\n` + `  ${this.utils.printExpected(messages)}\n` + `But it received:\n` + `  ${this.utils.printReceived(ws.messages)}` : () => {
      return this.utils.matcherHint(".toHaveReceivedMessages", "WS", "expected") + "\n\n" + `Expected the WS server to have received the following messages:\n` + `  ${this.utils.printExpected(messages)}\n` + `Received:\n` + `  ${this.utils.printReceived(ws.messages)}\n\n`;
    };
    return {
      actual: ws.messages,
      expected: messages,
      message,
      name: "toHaveReceivedMessages",
      pass
    };
  }

});

export { WS, WS as default };
