import { websocketWrapper } from './proxy';
import WS from "jest-websocket-mock";

let server: WS;
const URL = 'ws://localhost:1234';
const noop = () => {};
const noopRef = { current: noop };
let client: WebSocket;

beforeEach(() => {
  server = new WS(URL);
  client = new WebSocket(URL);
});

afterEach(() => {
  WS.clean();
});

test('It wraps a Websocket such that properties are still inspectable', () => {
  const wrappedWebsocket = websocketWrapper(
    client,
    noopRef,
  );
  
  expect('readyState' in wrappedWebsocket).toBe(true);
  //@ts-ignore
  expect(wrappedWebsocket['ReadyState']).toBe(undefined);
});

test('It prevents consumers of a shared websocket from invoking methods outside of the library', () => {
  const onCloseFn = jest.fn(() => {});
  const onMessageFn = jest.fn(() => {});

  client.onclose = onCloseFn;
  client.send = onMessageFn;

  const wrappedWebsocket = websocketWrapper(
    client,
    noopRef,
  );
  
  wrappedWebsocket.close();

  expect(onCloseFn).toHaveBeenCalledTimes(0);
  
  wrappedWebsocket.send('Hello');
  expect(onMessageFn).toHaveBeenCalledTimes(0);

  client.send('Hello');
  expect(onMessageFn).toHaveBeenCalledTimes(1);
});

test('It prevents consumers of a shared websocket from setting the event callbacks outside of the library', () => {
  const onCloseFn1 = jest.fn(() => {});
  const onCloseFn2 = jest.fn(() => {});
  const onMessageFn = jest.fn(() => {});

  client.onclose = onCloseFn1;
  client.send = onMessageFn;

  const wrappedWebsocket = websocketWrapper(
    client,
    noopRef,
  );
  
  expect(() => {
    wrappedWebsocket.onclose = onCloseFn2;
  }).toThrow();
});
