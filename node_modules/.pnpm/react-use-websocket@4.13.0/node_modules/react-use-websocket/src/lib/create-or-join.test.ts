import { MutableRefObject } from 'react';
import { createOrJoinSocket } from './create-or-join';
import WS from "jest-websocket-mock";
import { Options } from './types';
import { removeSubscriber, getSubscribers, hasSubscribers } from './manage-subscribers';

let server: WS;
const URL = 'ws://localhost:1234';

const noop = () => { };
const DEFAULT_OPTIONS: Options = { share: true };
let clientRef: MutableRefObject<WebSocket>;
let reconnectCountRef: MutableRefObject<number>;
let lastMessageTimeRef: MutableRefObject<number>;
let optionRef: MutableRefObject<Options>;
let noopRef: MutableRefObject<typeof noop>;

beforeEach(async () => {
  server = new WS(URL);
  clientRef = { current: new WebSocket(URL) };
  reconnectCountRef = { current: 0 };
  optionRef = { current: { ...DEFAULT_OPTIONS } };
  noopRef = { current: noop };
  if (hasSubscribers(URL)) {
    getSubscribers(URL).forEach(sub => removeSubscriber(URL, sub))
  }
});

afterEach(() => {
  WS.clean();
});

test('It only creates 1 websocket per URL and closes websocket when no subscribers are left', () => {
  clientRef = { current: new WebSocket(URL) };
  const closeFn = jest.fn(() => { });

  const cleanup1 = createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );
  const cleanup2 = createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );
  const cleanup3 = createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  clientRef.current.close = closeFn;

  expect(closeFn).toHaveBeenCalledTimes(0);

  expect(hasSubscribers(URL)).toBe(true);
  cleanup1();
  expect(hasSubscribers(URL)).toBe(true);
  expect(closeFn).toHaveBeenCalledTimes(0);

  cleanup2();
  cleanup3();
  expect(hasSubscribers(URL)).toBe(false);
  expect(closeFn).toHaveBeenCalledTimes(1);
})

test('All subscriber option-based onClose callbacks are invoked per close event', () => {
  clientRef = { current: new WebSocket(URL) };

  const onCloseFn = jest.fn(() => { });

  optionRef.current.onClose = onCloseFn;

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  expect(onCloseFn).toHaveBeenCalledTimes(0);

  server.close();

  expect(onCloseFn).toHaveBeenCalledTimes(3);
});

test('All subscriber option-based onError callbacks are not invoked on close event', () => {
  clientRef = { current: new WebSocket(URL) };

  const onErrorFn = jest.fn(() => { });

  optionRef.current.onError = onErrorFn;

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );


  server.close();

  expect(onErrorFn).toHaveBeenCalledTimes(0);
});

test('All subscriber option-based onMessage callbacks are invoked per message event', () => {
  clientRef = { current: new WebSocket(URL) };

  const onMessageFn = jest.fn(() => { });

  optionRef.current.onMessage = onMessageFn;

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  expect(onMessageFn).toHaveBeenCalledTimes(0);


  server.send('Hello');
  server.send('There');
  server.close();

  expect(onMessageFn).toHaveBeenCalledTimes(6);
});

test('All subscriber option-based onError callbacks are invoked per error event', () => {
  clientRef = { current: new WebSocket(URL) };

  const onErrorFn = jest.fn(() => { });

  optionRef.current.onError = onErrorFn;

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  expect(onErrorFn).toHaveBeenCalledTimes(0);

  server.error();

  expect(onErrorFn).toHaveBeenCalledTimes(3);
});

test('All subscriber option-based onClose callbacks are invoked per error event', () => {
  clientRef = { current: new WebSocket(URL) };

  const onErrorFn = jest.fn(() => { });
  const onCloseFn = jest.fn(() => { });

  optionRef.current.onError = onErrorFn;
  optionRef.current.onClose = onCloseFn;

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  createOrJoinSocket(
    clientRef,
    URL,
    noop,
    optionRef,
    noop,
    noopRef,
    reconnectCountRef,
    lastMessageTimeRef,
    noop,
  );

  expect(onErrorFn).toHaveBeenCalledTimes(0);
  expect(onCloseFn).toHaveBeenCalledTimes(0);

  server.error();

  expect(onErrorFn).toHaveBeenCalledTimes(3);
  expect(onCloseFn).toHaveBeenCalledTimes(3);
});
