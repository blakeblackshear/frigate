import { diff } from "jest-diff";
import WS from "./websocket";
import { DeserializedMessage } from "./websocket";

type ReceiveMessageOptions = {
  timeout?: number;
};

declare global {
  namespace jest {
    interface Matchers<R, T> {
      toReceiveMessage<TMessage = object>(
        message: DeserializedMessage<TMessage>,
        options?: ReceiveMessageOptions
      ): Promise<R>;
      toHaveReceivedMessages<TMessage = object>(
        messages: Array<DeserializedMessage<TMessage>>
      ): R;
    }
  }
}

const WAIT_DELAY = 1000;
const TIMEOUT = Symbol("timoeut");

const makeInvalidWsMessage = function makeInvalidWsMessage(
  this: jest.MatcherUtils,
  ws: WS,
  matcher: string
) {
  return (
    this.utils.matcherHint(
      this.isNot ? `.not.${matcher}` : `.${matcher}`,
      "WS",
      "expected"
    ) +
    "\n\n" +
    `Expected the websocket object to be a valid WS mock.\n` +
    `Received: ${typeof ws}\n` +
    `  ${this.utils.printReceived(ws)}`
  );
};

expect.extend({
  async toReceiveMessage(
    ws: WS,
    expected: DeserializedMessage,
    options?: ReceiveMessageOptions
  ) {
    const isWS = ws instanceof WS;
    if (!isWS) {
      return {
        pass: this.isNot, // always fail
        message: makeInvalidWsMessage.bind(this, ws, "toReceiveMessage"),
      };
    }

    const waitDelay = options?.timeout ?? WAIT_DELAY;

    let timeoutId;
    const messageOrTimeout = await Promise.race([
      ws.nextMessage,
      new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve(TIMEOUT), waitDelay);
      }),
    ]);
    clearTimeout(timeoutId);

    if (messageOrTimeout === TIMEOUT) {
      return {
        pass: this.isNot, // always fail
        message: () =>
          this.utils.matcherHint(
            this.isNot ? ".not.toReceiveMessage" : ".toReceiveMessage",
            "WS",
            "expected"
          ) +
          "\n\n" +
          `Expected the websocket server to receive a message,\n` +
          `but it didn't receive anything in ${waitDelay}ms.`,
      };
    }
    const received = messageOrTimeout;

    const pass = this.equals(received, expected);

    const message = pass
      ? () =>
          this.utils.matcherHint(".not.toReceiveMessage", "WS", "expected") +
          "\n\n" +
          `Expected the next received message to not equal:\n` +
          `  ${this.utils.printExpected(expected)}\n` +
          `Received:\n` +
          `  ${this.utils.printReceived(received)}`
      : () => {
          const diffString = diff(expected, received, { expand: this.expand });
          return (
            this.utils.matcherHint(".toReceiveMessage", "WS", "expected") +
            "\n\n" +
            `Expected the next received message to equal:\n` +
            `  ${this.utils.printExpected(expected)}\n` +
            `Received:\n` +
            `  ${this.utils.printReceived(received)}\n\n` +
            `Difference:\n\n${diffString}`
          );
        };

    return {
      actual: received,
      expected,
      message,
      name: "toReceiveMessage",
      pass,
    };
  },

  toHaveReceivedMessages(ws: WS, messages: Array<DeserializedMessage>) {
    const isWS = ws instanceof WS;
    if (!isWS) {
      return {
        pass: this.isNot, // always fail
        message: makeInvalidWsMessage.bind(this, ws, "toHaveReceivedMessages"),
      };
    }

    const received = messages.map((expected) =>
      // object comparison to handle JSON protocols
      ws.messages.some((actual) => this.equals(actual, expected))
    );
    const pass = this.isNot ? received.some(Boolean) : received.every(Boolean);
    const message = pass
      ? () =>
          this.utils.matcherHint(
            ".not.toHaveReceivedMessages",
            "WS",
            "expected"
          ) +
          "\n\n" +
          `Expected the WS server to not have received the following messages:\n` +
          `  ${this.utils.printExpected(messages)}\n` +
          `But it received:\n` +
          `  ${this.utils.printReceived(ws.messages)}`
      : () => {
          return (
            this.utils.matcherHint(
              ".toHaveReceivedMessages",
              "WS",
              "expected"
            ) +
            "\n\n" +
            `Expected the WS server to have received the following messages:\n` +
            `  ${this.utils.printExpected(messages)}\n` +
            `Received:\n` +
            `  ${this.utils.printReceived(ws.messages)}\n\n`
          );
        };

    return {
      actual: ws.messages,
      expected: messages,
      message,
      name: "toHaveReceivedMessages",
      pass,
    };
  },
});
