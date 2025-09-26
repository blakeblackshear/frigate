import { MutableRefObject } from 'react';
import { attachListeners } from './attach-listener';
import WS from "jest-websocket-mock";
import { Options } from './types';
import { ReadyState } from './constants';

let server: WS;

const noop = () => { };
const DEFAULT_OPTIONS: Options = {};
let client: WebSocket;
let reconnectCountRef: MutableRefObject<number>;
let lastMessageTimeRef: MutableRefObject<number>;
let optionRef: MutableRefObject<Options>;
const sleep = (duration: number): Promise<void> => new Promise(resolve => setTimeout(() => resolve(), duration));

beforeEach(async () => {
    server = new WS('ws://localhost:1234');
    client = new WebSocket('ws://localhost:1234');
    reconnectCountRef = { current: 0 };
    optionRef = { current: { ...DEFAULT_OPTIONS } };
});

afterEach(() => {
    WS.clean();
});

test('It returns a cleanup function that closes the websocket', () => {
    client.close = jest.fn((code?: number, reason?: string) => { });

    const cleanupFn = attachListeners(
        client,
        { setLastMessage: noop, setReadyState: noop },
        optionRef,
        noop,
        reconnectCountRef,
        lastMessageTimeRef,
        noop,
    );

    cleanupFn();

    expect(client.close).toHaveBeenCalled();
})

test('Messages received by the webwsocket are passed to the lastMessageSetter', () => {
    const setLastMessage = jest.fn((message: WebSocketEventMap['message']) => { });

    attachListeners(
        client,
        { setLastMessage, setReadyState: noop },
        optionRef,
        noop,
        reconnectCountRef,
        lastMessageTimeRef,
        noop,
    );

    server.send('hello');

    expect(setLastMessage.mock.calls[0][0].data).toEqual('hello');
})

test('The readyState setter is called when the websocket connection is open', () => {
    const setReadyState = jest.fn((readyState: ReadyState) => { });

    attachListeners(
        client,
        { setLastMessage: noop, setReadyState },
        optionRef,
        noop,
        reconnectCountRef,
        lastMessageTimeRef,
        noop,
    );

    server.close();

    expect(setReadyState).toHaveBeenCalled();
})

test('It attempts to reconnect up to specified reconnect attempts', async () => {
    const reconnect = jest.fn(() => {
        client = new WebSocket('ws://localhost:1234');
        attachListeners(
            client,
            { setLastMessage: noop, setReadyState: noop },
            optionRef,
            reconnect,
            reconnectCountRef,
            lastMessageTimeRef,
            noop,
        );
    });
    optionRef.current.shouldReconnect = () => true;
    optionRef.current.reconnectAttempts = 5;
    optionRef.current.reconnectInterval = 100;

    attachListeners(
        client,
        { setLastMessage: noop, setReadyState: noop },
        optionRef,
        reconnect,
        reconnectCountRef,
        lastMessageTimeRef,
        noop,
    );

    await sleep(1000);
    server.close();
    await sleep(1000);

    expect(reconnect).toHaveBeenCalledTimes(5);
})

test('It accepts a function for reconnectInterval to customize the timing of reconnect attempts', async () => {
    const reconnect = jest.fn(() => {
        client = new WebSocket('ws://localhost:1234');
        attachListeners(
            client,
            { setLastMessage: noop, setReadyState: noop },
            optionRef,
            reconnect,
            reconnectCountRef,
            lastMessageTimeRef,
            noop,
        );
    });
    optionRef.current.shouldReconnect = () => true;
    optionRef.current.reconnectAttempts = 5;
    optionRef.current.reconnectInterval = (attemptCount: number) => Math.pow(attemptCount, 2) * 100;

    attachListeners(
        client,
        { setLastMessage: noop, setReadyState: noop },
        optionRef,
        reconnect,
        reconnectCountRef,
        lastMessageTimeRef,
        noop,
    );

    await sleep(1000);
    server.close();
    await sleep(1000);

    //100 + 200 + 400 = 700 -- a 4th attempt would take 800ms, totalling 1500ms which would exceed the 1000ms since the server closed
    expect(reconnect).toHaveBeenCalledTimes(3);
})

test('When server closes the websocket, readyState transitions immediately to CLOSED', async () => {
    const setReadyStateFn = jest.fn((readyState: ReadyState) => { });

    attachListeners(
        client,
        { setLastMessage: noop, setReadyState: setReadyStateFn },
        optionRef,
        noop,
        reconnectCountRef,
        lastMessageTimeRef,
        noop,
    );
    await sleep(1000);
    server.close();
    await sleep(1000);
    expect(setReadyStateFn.mock.calls[0][0]).toEqual(ReadyState.OPEN);
    expect(setReadyStateFn.mock.calls[1][0]).toEqual(ReadyState.CLOSED);
    expect(setReadyStateFn).toHaveBeenCalledTimes(2);
})

test('When client closes the websocket using the provided cleanup function, readyState transitions to CLOSING and then to CLOSED', async () => {
    const setReadyStateFn = jest.fn((readyState: ReadyState) => { });

    const cleanup = attachListeners(
        client,
        { setLastMessage: noop, setReadyState: setReadyStateFn },
        optionRef,
        noop,
        reconnectCountRef,
        lastMessageTimeRef,
        noop,
    );

    await sleep(1000);
    cleanup();
    await sleep(1000);
    expect(setReadyStateFn.mock.calls[0][0]).toEqual(ReadyState.OPEN);
    expect(setReadyStateFn.mock.calls[1][0]).toEqual(ReadyState.CLOSING);
    expect(setReadyStateFn.mock.calls[2][0]).toEqual(ReadyState.CLOSED);
    expect(setReadyStateFn).toHaveBeenCalledTimes(3);
})
