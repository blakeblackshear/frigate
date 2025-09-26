import { Options, WebSocketHook } from './types';
export interface SocketIOMessageData<T = unknown> {
    type: string;
    payload: T | null;
}
export declare const useSocketIO: <T = unknown>(url: string | (() => string | Promise<string>) | null, options?: Options, connect?: boolean) => WebSocketHook<SocketIOMessageData<T | null>, SocketIOMessageData<T | null>>;
