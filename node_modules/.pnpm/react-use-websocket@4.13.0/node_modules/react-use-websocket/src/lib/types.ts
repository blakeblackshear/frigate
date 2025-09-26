import { MutableRefObject } from 'react';
import { ReadyState } from './constants';

export interface QueryParams {
  [key: string]: string | number;
}

export interface Options {
  fromSocketIO?: boolean;
  queryParams?: QueryParams;
  protocols?: string | string[];
  share?: boolean;
  onOpen?: (event: WebSocketEventMap['open']) => void;
  onClose?: (event: WebSocketEventMap['close']) => void;
  onMessage?: (event: WebSocketEventMap['message']) => void;
  onError?: (event: WebSocketEventMap['error']) => void;
  onReconnectStop?: (numAttempts: number) => void;
  shouldReconnect?: (event: WebSocketEventMap['close']) => boolean;
  reconnectInterval?: number | ((lastAttemptNumber: number) => number);
  reconnectAttempts?: number;
  filter?: (message: WebSocketEventMap['message']) => boolean;
  retryOnError?: boolean;
  eventSourceOptions?: EventSourceOnly;
  skipAssert?: boolean;
  heartbeat?: boolean | HeartbeatOptions;
  disableJson?: boolean;
}

export type EventSourceOnly = Omit<Options, 'eventSourceOptions'> & EventSourceInit;

export type HeartbeatOptions = {
  message?: "ping" | "pong" | string | (() => string);
  returnMessage?: "ping" | "pong" | string;
  timeout?: number;
  interval?: number;
};

export interface EventSourceEventHandlers {
  [eventName: string]: (message: EventSourceEventMap['message']) => void;
}

export interface EventSourceOptions extends EventSourceOnly {
  events?: EventSourceEventHandlers;
}

export type ReadyStateState = {
  [url: string]: ReadyState,
}

export type WebSocketMessage = string | ArrayBuffer | SharedArrayBuffer | Blob | ArrayBufferView;

export type SendMessage = (message: WebSocketMessage, keep?: boolean) => void;
export type SendJsonMessage = <T = unknown>(jsonMessage: T, keep?: boolean) => void;

export type Subscriber<T = WebSocketEventMap['message']> = {
  setLastMessage: (message: T) => void,
  setReadyState: (readyState: ReadyState) => void,
  optionsRef: MutableRefObject<Options>,
  reconnectCount: MutableRefObject<number>,
  lastMessageTime: MutableRefObject<number>,
  reconnect: MutableRefObject<() => void>,
}

export type WebSocketHook<T = unknown, P = WebSocketEventMap['message'] | null> = {
  sendMessage: SendMessage,
  sendJsonMessage: SendJsonMessage,
  lastMessage: P,
  lastJsonMessage: T,
  readyState: ReadyState,
  getWebSocket: () => (WebSocketLike | null),
}

export type EventSourceHook = Omit<
  WebSocketHook<EventSourceEventMap['message']>,
  'sendMessage' | 'sendJsonMessage' | 'lastMessage' | 'lastJsonMessage' | 'getWebSocket'
> & {
  lastEvent: EventSourceEventMap['message'] | null,
  getEventSource: () => (WebSocketLike | null),
}

export type WebSocketLike = WebSocket | EventSource;

