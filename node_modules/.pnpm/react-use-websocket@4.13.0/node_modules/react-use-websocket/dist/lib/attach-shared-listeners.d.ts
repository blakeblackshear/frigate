import { MutableRefObject } from 'react';
import { Options, SendMessage, WebSocketLike } from './types';
export declare const attachSharedListeners: (webSocketInstance: WebSocketLike, url: string, optionsRef: MutableRefObject<Options>, sendMessage: SendMessage) => () => void;
