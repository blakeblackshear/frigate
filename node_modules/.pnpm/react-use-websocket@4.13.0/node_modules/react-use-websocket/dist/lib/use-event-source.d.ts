import { EventSourceOptions, EventSourceHook } from './types';
export declare const useEventSource: (url: string | (() => string | Promise<string>) | null, { withCredentials, events, ...options }?: EventSourceOptions, connect?: boolean) => EventSourceHook;
