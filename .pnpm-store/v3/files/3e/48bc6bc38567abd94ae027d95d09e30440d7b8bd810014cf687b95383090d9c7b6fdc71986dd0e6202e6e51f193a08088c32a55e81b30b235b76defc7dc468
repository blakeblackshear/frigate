import { Subscriber } from './types';

export type Subscribers = {
    [url: string]: Set<Subscriber>,
}
  
const subscribers: Subscribers = {};
const EMPTY_LIST: Subscriber[] = [];

export const getSubscribers = (url: string): Subscriber[] => {
    if (hasSubscribers(url)) {
        return Array.from(subscribers[url]);
    }
    return EMPTY_LIST;
};

export const hasSubscribers = (url: string): boolean => {
    return subscribers[url]?.size > 0;
};

export const addSubscriber = (url: string, subscriber: Subscriber): void => {
    subscribers[url] = subscribers[url] || new Set<Subscriber>();
    subscribers[url].add(subscriber);
};

export const removeSubscriber = (url: string, subscriber: Subscriber): void => {
    subscribers[url].delete(subscriber);
};

export const resetSubscribers = (url?: string): void => {
    if (url && subscribers.hasOwnProperty(url)) {
        delete subscribers[url];
    } else {
        for (let url in subscribers){
            if (subscribers.hasOwnProperty(url)){
                delete subscribers[url];
            }
        }
    }
}
