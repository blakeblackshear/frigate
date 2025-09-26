import { Server, ServerOptions, CloseOptions, Client } from "mock-socket";
import Queue from "./queue";
interface WSOptions extends ServerOptions {
    jsonProtocol?: boolean;
}
export declare type DeserializedMessage<TMessage = object> = string | TMessage;
interface MockWebSocket extends Omit<Client, "close"> {
    close(options?: CloseOptions): void;
}
export default class WS {
    server: Server;
    serializer: (deserializedMessage: DeserializedMessage) => string;
    deserializer: (message: string) => DeserializedMessage;
    static instances: Array<WS>;
    messages: Array<DeserializedMessage>;
    messagesToConsume: Queue<unknown>;
    private _isConnected;
    private _isClosed;
    static clean(): void;
    constructor(url: string, opts?: WSOptions);
    get connected(): Promise<Client>;
    get closed(): Promise<void>;
    get nextMessage(): Promise<unknown>;
    on(eventName: "connection" | "message" | "close", callback: (socket: MockWebSocket) => void): void;
    send(message: DeserializedMessage): void;
    close(options?: CloseOptions): void;
    error(options?: CloseOptions): void;
}
export {};
