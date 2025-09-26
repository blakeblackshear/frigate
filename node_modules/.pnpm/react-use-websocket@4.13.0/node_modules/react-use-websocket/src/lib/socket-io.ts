import { SOCKET_IO_PING_INTERVAL, SOCKET_IO_PATH, SOCKET_IO_PING_CODE } from './constants';
import { QueryParams, SendMessage } from './types';

export const parseSocketIOUrl = (url: string) => {
  if (url) {
    const isSecure = /^https|wss/.test(url);
    const strippedProtocol = url.replace(/^(https?|wss?)(:\/\/)?/, '');
    const removedFinalBackSlack = strippedProtocol.replace(/\/$/, '');
    const protocol = isSecure ? 'wss' : 'ws';

    return `${protocol}://${removedFinalBackSlack}${SOCKET_IO_PATH}`;
  } else if (url === '') {
    const isSecure = /^https/.test(window.location.protocol);
    const protocol = isSecure ? 'wss' : 'ws';
    const port = window.location.port ? `:${window.location.port}` : '';

    return `${protocol}://${window.location.hostname}${port}${SOCKET_IO_PATH}`;
  }

  return url;
};

export const appendQueryParams = (url: string, params: QueryParams = {}): string => {
  const hasParamsRegex = /\?([\w]+=[\w]+)/;
  const alreadyHasParams = hasParamsRegex.test(url);

  const stringified = `${Object.entries(params).reduce((next, [key, value]) => {
    return next + `${key}=${value}&`;
  }, '').slice(0, -1)}`;

  return `${url}${alreadyHasParams ? '&' : '?'}${stringified}`;
};

export const setUpSocketIOPing = (sendMessage: SendMessage, interval = SOCKET_IO_PING_INTERVAL) => {
  const ping = () => sendMessage(SOCKET_IO_PING_CODE);

  return window.setInterval(ping, interval);
};
