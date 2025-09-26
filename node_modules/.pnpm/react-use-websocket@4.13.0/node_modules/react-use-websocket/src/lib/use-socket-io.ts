import { useMemo } from 'react'
import { useWebSocket } from './use-websocket'
import { DEFAULT_OPTIONS } from './constants'
import { Options, WebSocketHook } from './types';

export interface SocketIOMessageData<T = unknown> {
  type: string,
  payload: T | null,
}

const emptyEvent: SocketIOMessageData<null> = {
  type: 'empty',
  payload: null,
}

const getSocketData = <T = unknown>(event: WebSocketEventMap['message'] | null): SocketIOMessageData<T | null> => {
  if (!event || !event.data) {
    return emptyEvent
  }

  const match = event.data.match(/\[.*]/)

  if (!match) {
    return emptyEvent
  }

  const data = JSON.parse(match)

  if (!Array.isArray(data) || !data[1]) {
    return emptyEvent
  }

  return {
    type: data[0],
    payload: data[1],
  }
}

export const useSocketIO = <T = unknown>(
  url: string | (() => string | Promise<string>) | null,
  options: Options = DEFAULT_OPTIONS,
  connect: boolean = true,
): WebSocketHook<SocketIOMessageData<T | null>, SocketIOMessageData<T | null>> => {
  const optionsWithSocketIO = useMemo(() => ({
    ...options,
    fromSocketIO: true,
  }), [])

  const {
    sendMessage,
    sendJsonMessage,
    lastMessage,
    readyState,
    getWebSocket,
  } = useWebSocket(

    url,
    optionsWithSocketIO,
    connect,
  );

  const socketIOLastMessage = useMemo(() =>
    getSocketData<T>(lastMessage), [lastMessage]);

  return {
    sendMessage,
    sendJsonMessage,
    lastMessage: socketIOLastMessage,
    lastJsonMessage: socketIOLastMessage,
    readyState,
    getWebSocket,
  };
}
