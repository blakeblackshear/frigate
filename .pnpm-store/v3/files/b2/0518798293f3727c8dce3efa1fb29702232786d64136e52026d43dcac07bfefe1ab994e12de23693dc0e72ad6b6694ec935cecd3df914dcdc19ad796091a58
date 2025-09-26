import { WebSocketClientConnectionProtocol } from '@mswjs/interceptors/lib/browser/interceptors/WebSocket';
import { WebSocketClientStore, SerializedWebSocketClient } from './WebSocketClientStore.mjs';
import '@mswjs/interceptors/WebSocket';

declare class WebSocketMemoryClientStore implements WebSocketClientStore {
    private store;
    constructor();
    add(client: WebSocketClientConnectionProtocol): Promise<void>;
    getAll(): Promise<Array<SerializedWebSocketClient>>;
    deleteMany(clientIds: Array<string>): Promise<void>;
}

export { WebSocketMemoryClientStore };
