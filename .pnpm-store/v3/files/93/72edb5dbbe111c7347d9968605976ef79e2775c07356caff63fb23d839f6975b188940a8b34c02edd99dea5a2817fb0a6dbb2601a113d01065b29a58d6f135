import { Subscriber } from './types';
export type Subscribers = {
    [url: string]: Set<Subscriber>;
};
export declare const getSubscribers: (url: string) => Subscriber[];
export declare const hasSubscribers: (url: string) => boolean;
export declare const addSubscriber: (url: string, subscriber: Subscriber) => void;
export declare const removeSubscriber: (url: string, subscriber: Subscriber) => void;
export declare const resetSubscribers: (url?: string) => void;
