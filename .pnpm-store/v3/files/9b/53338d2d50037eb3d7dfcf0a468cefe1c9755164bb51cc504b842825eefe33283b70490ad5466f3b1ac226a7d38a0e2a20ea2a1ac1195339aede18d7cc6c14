import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { DEFAULT_OPTIONS, isEventSourceSupported, ReadyState, UNPARSABLE_JSON_OBJECT } from './constants';
import { createOrJoinSocket } from './create-or-join';
import { getUrl } from './get-url';
import websocketWrapper from './proxy';
import {
  Options,
  ReadyStateState,
  SendMessage,
  SendJsonMessage,
  WebSocketMessage,
  WebSocketHook,
  WebSocketLike,
} from './types';
import { assertIsWebSocket } from './util';

export const useWebSocket = <T = unknown>(
  url: string | (() => string | Promise<string>) | null,
  options: Options = DEFAULT_OPTIONS,
  connect: boolean = true,
): WebSocketHook<T> => {
  const [lastMessage, setLastMessage] = useState<WebSocketEventMap['message'] | null>(null);
  const [readyState, setReadyState] = useState<ReadyStateState>({});
  const lastJsonMessage: T = useMemo(() => {
    if (!options.disableJson && lastMessage) {
      try {
        return JSON.parse(lastMessage.data);
      } catch (e) {
        return UNPARSABLE_JSON_OBJECT;
      }
    }
    return null;
  }, [lastMessage, options.disableJson]);
  const convertedUrl = useRef<string | null>(null);
  const webSocketRef = useRef<WebSocketLike | null>(null);
  const startRef = useRef<() => void>(() => void 0);
  const reconnectCount = useRef<number>(0);
  const lastMessageTime = useRef<number>(Date.now());
  const messageQueue = useRef<WebSocketMessage[]>([]);
  const webSocketProxy = useRef<WebSocketLike | null>(null);
  const optionsCache = useRef<Options>(options);
  optionsCache.current = options;

  const readyStateFromUrl: ReadyState =
    convertedUrl.current && readyState[convertedUrl.current] !== undefined ?
      readyState[convertedUrl.current] :
      url !== null && connect === true ?
        ReadyState.CONNECTING :
        ReadyState.UNINSTANTIATED;

  const stringifiedQueryParams = options.queryParams ? JSON.stringify(options.queryParams) : null;

  const sendMessage: SendMessage = useCallback((message, keep = true) => {
    if (isEventSourceSupported && webSocketRef.current instanceof EventSource) {
      console.warn('Unable to send a message from an eventSource');
      return;
    }

    if (webSocketRef.current?.readyState === ReadyState.OPEN) {
      assertIsWebSocket(webSocketRef.current, optionsCache.current.skipAssert);
      webSocketRef.current.send(message);
    } else if (keep) {
      messageQueue.current.push(message);
    }
  }, []);

  const sendJsonMessage: SendJsonMessage = useCallback((message, keep = true) => {
    sendMessage(JSON.stringify(message), keep);
  }, [sendMessage]);

  const getWebSocket = useCallback(() => {
    if (optionsCache.current.share !== true || (isEventSourceSupported && webSocketRef.current instanceof EventSource)) {
      return webSocketRef.current;
    }

    if (webSocketProxy.current === null && webSocketRef.current) {
      assertIsWebSocket(webSocketRef.current, optionsCache.current.skipAssert);
      webSocketProxy.current = websocketWrapper(webSocketRef.current, startRef);
    }

    return webSocketProxy.current;
  }, []);

  useEffect(() => {
    if (url !== null && connect === true) {
      let removeListeners: () => void;
      let expectClose = false;
      let createOrJoin = true;

      const start = async () => {
        convertedUrl.current = await getUrl(url, optionsCache);

        if (convertedUrl.current === null) {
          console.error('Failed to get a valid URL. WebSocket connection aborted.');
          convertedUrl.current = 'ABORTED';
          flushSync(() => setReadyState(prev => ({
            ...prev,
            ABORTED: ReadyState.CLOSED,
          })));

          return;
        }

        const protectedSetLastMessage = (message: WebSocketEventMap['message']) => {
          if (!expectClose) {
            flushSync(() => setLastMessage(message));
          }
        };

        const protectedSetReadyState = (state: ReadyState) => {
          if (!expectClose) {
            flushSync(() => setReadyState(prev => ({
              ...prev,
              ...(convertedUrl.current && { [convertedUrl.current]: state }),
            })));
          }
        };

        if (createOrJoin) {
          removeListeners = createOrJoinSocket(
            webSocketRef,
            convertedUrl.current,
            protectedSetReadyState,
            optionsCache,
            protectedSetLastMessage,
            startRef,
            reconnectCount,
            lastMessageTime,
            sendMessage,
          );
        }
      };

      startRef.current = () => {
        if (!expectClose) {
          if (webSocketProxy.current) webSocketProxy.current = null;
          removeListeners?.();
          start();
        }
      };

      start();
      return () => {
        expectClose = true;
        createOrJoin = false;
        if (webSocketProxy.current) webSocketProxy.current = null;
        removeListeners?.();
        setLastMessage(null);
      };
    } else if (url === null || connect === false) {
      reconnectCount.current = 0; // reset reconnection attempts
      setReadyState(prev => ({
        ...prev,
        ...(convertedUrl.current && { [convertedUrl.current]: ReadyState.CLOSED }),
      }));
    }
  }, [url, connect, stringifiedQueryParams, sendMessage]);

  useEffect(() => {
    if (readyStateFromUrl === ReadyState.OPEN) {
      messageQueue.current.splice(0).forEach(message => {
        sendMessage(message);
      });
    }
  }, [readyStateFromUrl]);

  return {
    sendMessage,
    sendJsonMessage,
    lastMessage,
    lastJsonMessage,
    readyState: readyStateFromUrl,
    getWebSocket,
  };
};
