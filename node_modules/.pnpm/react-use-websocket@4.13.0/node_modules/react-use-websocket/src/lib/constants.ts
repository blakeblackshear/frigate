import { EventSourceEventHandlers, EventSourceOptions } from "./types";

const MILLISECONDS = 1;
const SECONDS = 1000 * MILLISECONDS;

export const DEFAULT_OPTIONS = {};
export const EMPTY_EVENT_HANDLERS: EventSourceEventHandlers = {};
export const DEFAULT_EVENT_SOURCE_OPTIONS: EventSourceOptions = {
  withCredentials: false,
  events: EMPTY_EVENT_HANDLERS,
};
export const SOCKET_IO_PING_INTERVAL = 25 * SECONDS;
export const SOCKET_IO_PATH = '/socket.io/?EIO=3&transport=websocket';
export const SOCKET_IO_PING_CODE = '2';
export const DEFAULT_RECONNECT_LIMIT = 20;
export const DEFAULT_RECONNECT_INTERVAL_MS = 5000;
export const UNPARSABLE_JSON_OBJECT = {};
export const DEFAULT_HEARTBEAT = {
  message: 'ping',
  timeout: 60000,
  interval: 25000,
};

export enum ReadyState {
  UNINSTANTIATED = -1,
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

const eventSourceSupported = () => {
  try {
    return 'EventSource' in globalThis;
  } catch (e) {
    return false;
  }
}

export const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
export const isEventSourceSupported = !isReactNative && eventSourceSupported();
