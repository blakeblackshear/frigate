import { MutableRefObject } from 'react';
import { ReadyState } from './constants';
import { Options, SendMessage, WebSocketLike } from './types';
export interface Setters {
    setLastMessage: (message: WebSocketEventMap['message']) => void;
    setReadyState: (readyState: ReadyState) => void;
}
export declare const attachListeners: (webSocketInstance: WebSocketLike, setters: Setters, optionsRef: MutableRefObject<Options>, reconnect: () => void, reconnectCount: MutableRefObject<number>, lastMessageTime: MutableRefObject<number>, sendMessage: SendMessage) => (() => void);
