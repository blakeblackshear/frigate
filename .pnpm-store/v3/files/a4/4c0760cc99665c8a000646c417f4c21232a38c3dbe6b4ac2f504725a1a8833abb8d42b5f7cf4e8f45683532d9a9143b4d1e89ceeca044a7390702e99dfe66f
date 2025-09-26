import { MutableRefObject } from 'react';

type IfEquals<X, Y, A=X, B=never> =
  (<T>() => T extends X ? 1 : 2) extends
  (<T>() => T extends Y ? 1 : 2) ? A : B;

type WritableKeys<T> = {
  [P in keyof T]-?: IfEquals<{ [Q in P]: T[P] }, { -readonly [Q in P]: T[P] }, P>
}[keyof T];

export const websocketWrapper = (
  webSocket: WebSocket,
  start: MutableRefObject<() => void>,
): WebSocket => {

  return new Proxy<WebSocket>(webSocket, {
    get: (obj, key: keyof WebSocket) => {
      const val = obj[key];
      if ((key as any) === 'reconnect') return start;
      if (typeof val === 'function') {
        console.error('Calling methods directly on the websocket is not supported at this moment. You must use the methods returned by useWebSocket.');
        
        //Prevent error thrown by invoking a non-function
        return () => {};
      } else {
        return val;
      }
    },
    set: <T extends WritableKeys<WebSocket>>(obj: WebSocket, key: T, val: WebSocket[T]) => {
      if (/^on/.test(key)) {
        console.warn('The websocket\'s event handlers should be defined through the options object passed into useWebSocket.')
        return false;
      } else {
        obj[key] = val;
        return true;
      }
    },
  });
};

export default websocketWrapper;
