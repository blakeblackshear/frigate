import { MutableRefObject } from 'react';
import { getUrl } from './get-url';
import { Options } from './types';

let optionRef: MutableRefObject<Options>;

const URL = 'ws://localhost:1234';
const SOCKET_IO_URL = 'http://localhost:1234';

const getUrlAsync = () => {
  return new Promise<string>(resolve => {
    window.setTimeout(() => {
      resolve(URL);
    }, 500);
  });
};

beforeEach(() => {
  optionRef = { current: {} };
});

test('If passed a funtion, it will return a promise that resolves to the return value of the function, after being parsed', async () => {
  const wsUrl = await getUrl(getUrlAsync, optionRef);
  expect(wsUrl).toEqual(URL);
});

test('If fromSocketIO is passed as an option, socketIO protocol will be used', async () => {
  optionRef.current.fromSocketIO = true;

  const wsUrl = await getUrl(SOCKET_IO_URL, optionRef);
  expect(wsUrl!.endsWith('socket.io/?EIO=3&transport=websocket')).toBe(true);
});

test('If query params are passed in the options, object will be converted to stringified params and appended to url', async () => {
  optionRef.current.queryParams = { type: 'user', id: 5 };

  const wsUrl = await getUrl(URL, optionRef);
  expect(wsUrl!.endsWith('?type=user&id=5')).toBe(true);
});
