import { MutableRefObject } from 'react';
import { attachSharedListeners } from './attach-shared-listeners';
import WS from "jest-websocket-mock";
import { Options, Subscriber } from './types';
import { ReadyState } from './constants';
import { sharedWebSockets } from './globals';
import { addSubscriber, removeSubscriber, getSubscribers, hasSubscribers } from './manage-subscribers';

let server: WS;
const URL = 'ws://localhost:1234';

const noop = () => { };
const DEFAULT_OPTIONS: Options = {};
let client: WebSocket;
let subscriber1: Subscriber;
let subscriber2: Subscriber;
let reconnectCountRef: MutableRefObject<number>;
let lastMessageTimeRef: MutableRefObject<number>;
let optionRef: MutableRefObject<Options>;

beforeEach(async () => {
  server = new WS(URL);
  client = new WebSocket(URL);
  reconnectCountRef = { current: 0 };
  optionRef = { current: { ...DEFAULT_OPTIONS } };
  if (hasSubscribers(URL)) {
    removeSubscriber(URL, subscriber1);
    removeSubscriber(URL, subscriber2);
  }


  subscriber1 = {
    setLastMessage: noop,
    setReadyState: noop,
    optionsRef: optionRef,
    reconnectCount: reconnectCountRef,
    lastMessageTime: lastMessageTimeRef,
    reconnect: { current: noop },
  }

  subscriber2 = {
    setLastMessage: noop,
    setReadyState: noop,
    optionsRef: optionRef,
    reconnectCount: reconnectCountRef,
    lastMessageTime: lastMessageTimeRef,
    reconnect: { current: noop },
  }

  addSubscriber(URL, subscriber1);
  addSubscriber(URL, subscriber2);

  sharedWebSockets[URL] = client;
});

afterEach(() => {
  WS.clean();
});

test('It attaches handlers to the websocket that updates all subscribers on messages', () => {
  const [sub1, sub2] = getSubscribers(URL);
  const sub1MsgSetter = jest.fn((msg: any) => null);
  const sub2MsgSetter = jest.fn((msg: any) => null);
  sub1.setLastMessage = sub1MsgSetter;
  sub2.setLastMessage = sub2MsgSetter;

  attachSharedListeners(
    client,
    URL,
    optionRef,
    noop,
  );

  server.send('hello');

  expect(sub1MsgSetter.mock.calls[0][0].data).toEqual('hello');
  expect(sub2MsgSetter.mock.calls[0][0].data).toEqual('hello');
})

test('It attaches handlers to the websocket that updates all subscribers on ready state events', () => {
  const [sub1, sub2] = getSubscribers(URL);
  const sub1ReadyStateSetter = jest.fn((readyState: ReadyState) => null);
  const sub2ReadyStateSetter = jest.fn((readyState: ReadyState) => null);
  sub1.setReadyState = sub1ReadyStateSetter;
  sub2.setReadyState = sub2ReadyStateSetter;

  attachSharedListeners(
    client,
    URL,
    optionRef,
    noop,
  );

  server.close();

  expect(sub1ReadyStateSetter).toHaveBeenCalled();
  expect(sub2ReadyStateSetter).toHaveBeenCalled();
})
