import { MutableRefObject } from 'react';
import { Options, SendMessage, WebSocketLike } from './types';
import { ReadyState } from './constants';
export declare const createOrJoinSocket: (webSocketRef: MutableRefObject<WebSocketLike | null>, url: string, setReadyState: (readyState: ReadyState) => void, optionsRef: MutableRefObject<Options>, setLastMessage: (message: WebSocketEventMap["message"]) => void, startRef: MutableRefObject<() => void>, reconnectCount: MutableRefObject<number>, lastMessageTime: MutableRefObject<number>, sendMessage: SendMessage) => (() => void);
