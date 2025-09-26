import { MutableRefObject } from 'react';
import { sharedWebSockets } from './globals';
import { Options, SendMessage, Subscriber, WebSocketLike } from './types';
import { isEventSourceSupported, ReadyState, isReactNative } from './constants';
import { attachListeners } from './attach-listener';
import { attachSharedListeners } from './attach-shared-listeners';
import { addSubscriber, removeSubscriber, hasSubscribers } from './manage-subscribers';

//TODO ensure that all onClose callbacks are called

const cleanSubscribers = (
  url: string,
  subscriber: Subscriber,
  optionsRef: MutableRefObject<Options>,
  setReadyState: (readyState: ReadyState) => void,
  clearSocketIoPingInterval: (() => void) | null,
) => {
  return () => {
    removeSubscriber(url, subscriber);
    if (!hasSubscribers(url)) {
      try {
        const socketLike = sharedWebSockets[url];
        if (socketLike instanceof WebSocket) {
          socketLike.onclose = (event: WebSocketEventMap['close']) => {
            if (optionsRef.current.onClose) {
              optionsRef.current.onClose(event);
            }
            setReadyState(ReadyState.CLOSED);
          };
        }
        socketLike.close();
      } catch (e) {

      }
      if (clearSocketIoPingInterval) clearSocketIoPingInterval();

      delete sharedWebSockets[url];
    }
  }
};

export const createOrJoinSocket = (
  webSocketRef: MutableRefObject<WebSocketLike | null>,
  url: string,
  setReadyState: (readyState: ReadyState) => void,
  optionsRef: MutableRefObject<Options>,
  setLastMessage: (message: WebSocketEventMap['message']) => void,
  startRef: MutableRefObject<() => void>,
  reconnectCount: MutableRefObject<number>,
  lastMessageTime: MutableRefObject<number>,
  sendMessage: SendMessage,
): (() => void) => {
  if (!isEventSourceSupported && optionsRef.current.eventSourceOptions) {
    if (isReactNative) {
      throw new Error('EventSource is not supported in ReactNative');
    } else {
      throw new Error('EventSource is not supported');
    }
  }

  if (optionsRef.current.share) {
    let clearSocketIoPingInterval: ((() => void) | null) = null;
    if (sharedWebSockets[url] === undefined) {
      sharedWebSockets[url] = optionsRef.current.eventSourceOptions ?
        new EventSource(url, optionsRef.current.eventSourceOptions) :
        new WebSocket(url, optionsRef.current.protocols);
      webSocketRef.current = sharedWebSockets[url];
      setReadyState(ReadyState.CONNECTING);
      clearSocketIoPingInterval = attachSharedListeners(
        sharedWebSockets[url],
        url,
        optionsRef,
        sendMessage,
      );
    } else {
      webSocketRef.current = sharedWebSockets[url];
      setReadyState(sharedWebSockets[url].readyState);
    }

    const subscriber: Subscriber = {
      setLastMessage,
      setReadyState,
      optionsRef,
      reconnectCount,
      lastMessageTime,
      reconnect: startRef,
    };

    addSubscriber(url, subscriber);

    return cleanSubscribers(
      url,
      subscriber,
      optionsRef,
      setReadyState,
      clearSocketIoPingInterval,
    );
  } else {
    webSocketRef.current = optionsRef.current.eventSourceOptions ?
      new EventSource(url, optionsRef.current.eventSourceOptions) :
      new WebSocket(url, optionsRef.current.protocols);
    setReadyState(ReadyState.CONNECTING);
    if (!webSocketRef.current) {
      throw new Error('WebSocket failed to be created');
    }

    return attachListeners(
      webSocketRef.current,
      {
        setLastMessage,
        setReadyState
      },
      optionsRef,
      startRef.current,
      reconnectCount,
      lastMessageTime,
      sendMessage,
    );
  }
};
