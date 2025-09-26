import {
  parseSocketIOUrl,
  appendQueryParams,
  setUpSocketIOPing,
} from './socket-io';
import { SOCKET_IO_PING_CODE } from './constants';
import WS from "jest-websocket-mock";

let server: WS;
const URL = 'ws://localhost:1234';
let client: WebSocket;
const sleep = (duration: number): Promise<void> => new Promise(resolve => setTimeout(() => resolve(), duration));
const TEST_PING_INTERVAL = 500;
const TEST_PING_BUFFER = 100;

beforeEach(() => {
  server = new WS(URL);
  client = new WebSocket(URL);
});

afterEach(() => {
  WS.clean();
});

test('parseSocketIOUrl replaces http protocol with websocket protocol', () => {
  const wsUrl = parseSocketIOUrl('http://localhost:1234');
  expect(wsUrl.startsWith('ws://')).toBe(true);
});

test('parseSocketIOUrl replaces \'http\' with \'ws\' and \'https\' with \'wss\'', () => {
  const wsUrl = parseSocketIOUrl('https://localhost:1234');
  expect(wsUrl.startsWith('wss://')).toBe(true);
})

test('parseSocketIOUrl converts urls that end with a forward slash the same as without', () => {
  expect(parseSocketIOUrl('https://localhost:1234')).toEqual(parseSocketIOUrl('https://localhost:1234/'));
})

test('appendQueryParams adds query params from an object to a given url', () => {
  const queryParams = { type: 'user', id: 5 };
  const wsUrl = appendQueryParams(URL, queryParams);
  expect(wsUrl).toEqual(`${URL}?type=user&id=5`);
})

test('appendQueryParams properly adds query params to a url that already contains query params', () => {
  const queryParams = { type: 'user', id: 5 };
  let wsUrl = appendQueryParams(URL, queryParams);
  wsUrl = appendQueryParams(wsUrl, { name: 'bob' });

  expect(wsUrl).toEqual(`${URL}?type=user&id=5&name=bob`);
})

test('setUpSocketIOPing sets up an interval that sends a keep-alive message from the client to socket-io server', async () => {
  const sendFn = jest.fn();

  const interval = setUpSocketIOPing(sendFn, TEST_PING_INTERVAL);
  await sleep((TEST_PING_INTERVAL * 5) + TEST_PING_BUFFER);

  window.clearInterval(interval);
  expect(sendFn).toHaveBeenCalledTimes(5);
});

test('setUpSocketIOPing sends the proper ping code', async () => {
  const sendFn = jest.fn();

  const interval = setUpSocketIOPing(sendFn, TEST_PING_INTERVAL);
  await sleep((TEST_PING_INTERVAL * 1) + TEST_PING_BUFFER);

  window.clearInterval(interval);
  expect(sendFn.mock.calls[0][0]).toEqual(SOCKET_IO_PING_CODE);
});
