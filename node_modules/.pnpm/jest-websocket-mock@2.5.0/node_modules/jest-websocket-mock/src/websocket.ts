import { Server, ServerOptions, CloseOptions, Client } from "mock-socket";
import Queue from "./queue";
import act from "./act-compat";

const identity = (x: string) => x;

interface WSOptions extends ServerOptions {
  jsonProtocol?: boolean;
}
export type DeserializedMessage<TMessage = object> = string | TMessage;

// The WebSocket object passed to the `connection` callback is actually
// a WebSocket proxy that overrides the signature of the `close` method.
// To work around this inconsistency, we need to override the WebSocket
// interface. See https://github.com/romgain/jest-websocket-mock/issues/26#issuecomment-571579567
interface MockWebSocket extends Omit<Client, "close"> {
  close(options?: CloseOptions): void;
}

export default class WS {
  server: Server;
  serializer: (deserializedMessage: DeserializedMessage) => string;
  deserializer: (message: string) => DeserializedMessage;

  static instances: Array<WS> = [];
  messages: Array<DeserializedMessage> = [];
  messagesToConsume = new Queue();

  private _isConnected: Promise<Client>;
  private _isClosed: Promise<{}>;

  static clean() {
    WS.instances.forEach((instance) => {
      instance.close();
      instance.messages = [];
    });
    WS.instances = [];
  }

  constructor(url: string, opts: WSOptions = {}) {
    WS.instances.push(this);

    const { jsonProtocol = false, ...serverOptions } = opts;
    this.serializer = jsonProtocol ? JSON.stringify : identity;
    this.deserializer = jsonProtocol ? JSON.parse : identity;

    let connectionResolver: (socket: Client) => void,
      closedResolver!: (socket: Client) => void;
    this._isConnected = new Promise((done) => (connectionResolver = done));
    this._isClosed = new Promise((done) => (closedResolver = done));

    this.server = new Server(url, serverOptions);

    this.server.on("close", closedResolver);

    this.server.on("connection", (socket: Client) => {
      connectionResolver(socket);

      socket.on("message", (message) => {
        const parsedMessage = this.deserializer(message as string);
        this.messages.push(parsedMessage);
        this.messagesToConsume.put(parsedMessage);
      });
    });
  }

  get connected() {
    let resolve: (socket: Client) => void;
    const connectedPromise = new Promise<Client>((done) => (resolve = done));
    const waitForConnected = async () => {
      await act(async () => {
        await this._isConnected;
      });
      resolve(await this._isConnected); // make sure `await act` is really done
    };
    waitForConnected();
    return connectedPromise;
  }

  get closed() {
    let resolve: () => void;
    const closedPromise = new Promise<void>((done) => (resolve = done));
    const waitForclosed = async () => {
      await act(async () => {
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

  on(
    eventName: "connection" | "message" | "close",
    callback: (socket: MockWebSocket) => void
  ): void {
    // @ts-ignore https://github.com/romgain/jest-websocket-mock/issues/26#issuecomment-571579567
    this.server.on(eventName, callback);
  }

  send(message: DeserializedMessage) {
    act(() => {
      this.server.emit("message", this.serializer(message));
    });
  }

  close(options?: CloseOptions) {
    act(() => {
      this.server.close(options);
    });
  }

  error(options?: CloseOptions) {
    act(() => {
      this.server.emit("error", null);
    });
    this.server.close(options);
  }
}
