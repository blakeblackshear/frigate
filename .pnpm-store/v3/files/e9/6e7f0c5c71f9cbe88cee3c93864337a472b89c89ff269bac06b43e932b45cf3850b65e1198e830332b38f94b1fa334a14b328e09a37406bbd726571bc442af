import { sharedWebSockets } from './globals';
import { DEFAULT_RECONNECT_LIMIT, DEFAULT_RECONNECT_INTERVAL_MS, ReadyState, isEventSourceSupported } from './constants';
import { getSubscribers } from './manage-subscribers';
import { MutableRefObject } from 'react';
import { HeartbeatOptions, Options, SendMessage, WebSocketLike } from './types';
import { setUpSocketIOPing } from './socket-io';
import { heartbeat } from './heartbeat';

const bindMessageHandler = (
  webSocketInstance: WebSocketLike,
  url: string,
  heartbeatOptions?: boolean | HeartbeatOptions
) => {
  webSocketInstance.onmessage = (message: WebSocketEventMap['message']) => {
    getSubscribers(url).forEach(subscriber => {
      if (subscriber.optionsRef.current.onMessage) {
        subscriber.optionsRef.current.onMessage(message);
      }

      if (typeof subscriber?.lastMessageTime?.current === 'number') {
        subscriber.lastMessageTime.current = Date.now();
      }

      if (
        typeof subscriber.optionsRef.current.filter === 'function' &&
        subscriber.optionsRef.current.filter(message) !== true
      ) {
        return;
      }

      if (
        heartbeatOptions &&
        typeof heartbeatOptions !== "boolean" &&
        heartbeatOptions?.returnMessage === message.data
      )
        return;

      subscriber.setLastMessage(message);
    });
  };
};

const bindOpenHandler = (
  webSocketInstance: WebSocketLike,
  url: string,
  heartbeatOptions?: boolean | HeartbeatOptions
) => {
  webSocketInstance.onopen = (event: WebSocketEventMap['open']) => {
    const subscribers = getSubscribers(url);
    subscribers.forEach(subscriber => {
      subscriber.reconnectCount.current = 0;
      if (subscriber.optionsRef.current.onOpen) {
        subscriber.optionsRef.current.onOpen(event);
      }

      subscriber.setReadyState(ReadyState.OPEN);

      let onMessageCb: () => void;

      if (heartbeatOptions && webSocketInstance instanceof WebSocket) {
        subscriber.lastMessageTime.current = Date.now();
      }
    });
    if (heartbeatOptions && webSocketInstance instanceof WebSocket) {
      heartbeat(webSocketInstance, subscribers.map(subscriber => subscriber.lastMessageTime), typeof heartbeatOptions === 'boolean' ? undefined : heartbeatOptions,);
    }
  };
};

const bindCloseHandler = (
  webSocketInstance: WebSocketLike,
  url: string,
) => {
  if (webSocketInstance instanceof WebSocket) {
    webSocketInstance.onclose = (event: WebSocketEventMap['close']) => {
      getSubscribers(url).forEach(subscriber => {
        if (subscriber.optionsRef.current.onClose) {
          subscriber.optionsRef.current.onClose(event);
        }

        subscriber.setReadyState(ReadyState.CLOSED);
      });

      delete sharedWebSockets[url];

      getSubscribers(url).forEach(subscriber => {
        if (
          subscriber.optionsRef.current.shouldReconnect &&
          subscriber.optionsRef.current.shouldReconnect(event)
        ) {
          const reconnectAttempts = subscriber.optionsRef.current.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT;
          if (subscriber.reconnectCount.current < reconnectAttempts) {
            const nextReconnectInterval = typeof subscriber.optionsRef.current.reconnectInterval === 'function' ?
              subscriber.optionsRef.current.reconnectInterval(subscriber.reconnectCount.current) :
              subscriber.optionsRef.current.reconnectInterval;

            setTimeout(() => {
              subscriber.reconnectCount.current++;
              subscriber.reconnect.current();
            }, nextReconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
          } else {
            subscriber.optionsRef.current.onReconnectStop && subscriber.optionsRef.current.onReconnectStop(subscriber.optionsRef.current.reconnectAttempts as number);
            console.warn(`Max reconnect attempts of ${reconnectAttempts} exceeded`);
          }
        }
      });
    };
  }
};

const bindErrorHandler = (
  webSocketInstance: WebSocketLike,
  url: string,
) => {
  webSocketInstance.onerror = (error: WebSocketEventMap['error']) => {
    getSubscribers(url).forEach(subscriber => {
      if (subscriber.optionsRef.current.onError) {
        subscriber.optionsRef.current.onError(error);
      }
      if (isEventSourceSupported && webSocketInstance instanceof EventSource) {
        subscriber.optionsRef.current.onClose && subscriber.optionsRef.current.onClose({
          ...error,
          code: 1006,
          reason: `An error occurred with the EventSource: ${error}`,
          wasClean: false,
        });

        subscriber.setReadyState(ReadyState.CLOSED);
      }
    });
    if (isEventSourceSupported && webSocketInstance instanceof EventSource) {
      webSocketInstance.close();
    }
  };
};

export const attachSharedListeners = (
  webSocketInstance: WebSocketLike,
  url: string,
  optionsRef: MutableRefObject<Options>,
  sendMessage: SendMessage,
) => {
  let interval: number;

  if (optionsRef.current.fromSocketIO) {
    interval = setUpSocketIOPing(sendMessage);
  }

  bindMessageHandler(webSocketInstance, url, optionsRef.current.heartbeat);
  bindCloseHandler(webSocketInstance, url);
  bindOpenHandler(webSocketInstance, url, optionsRef.current.heartbeat);
  bindErrorHandler(webSocketInstance, url);

  return () => {
    if (interval) clearInterval(interval);
  };
};
