import { sharedWebSockets, resetWebSockets } from './globals';
import { WebSocketLike } from './types';

const FIRST_URL = 'ws://localhost:1234';
const SECOND_URL = 'ws://localhost:4321';

const websocket1 = {} as WebSocketLike;
const websocket2 = {} as WebSocketLike;

beforeEach(() => {
    resetWebSockets();
});

test('resetWebsockets removes subscribers only for a specific URL', () => {
    sharedWebSockets[FIRST_URL] = websocket1;
    sharedWebSockets[SECOND_URL] = websocket2;
    expect(Object.values(sharedWebSockets)).toHaveLength(2);

    resetWebSockets(FIRST_URL);

    expect(sharedWebSockets[FIRST_URL]).toBeUndefined();
    expect(sharedWebSockets[SECOND_URL]).not.toBeUndefined();
});

test('resetWebsockets removes all subscribers when URL is not set', () => {
    sharedWebSockets[FIRST_URL] = websocket1;
    sharedWebSockets[SECOND_URL] = websocket2;
    expect(Object.values(sharedWebSockets)).toHaveLength(2);

    resetWebSockets();

    expect(Object.values(sharedWebSockets)).toHaveLength(0);
});
