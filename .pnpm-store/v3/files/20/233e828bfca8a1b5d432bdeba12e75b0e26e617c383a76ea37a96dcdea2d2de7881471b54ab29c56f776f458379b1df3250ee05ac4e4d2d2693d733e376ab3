import {
    getSubscribers,
    hasSubscribers,
    addSubscriber,
    removeSubscriber,
    resetSubscribers,
} from './manage-subscribers';
import { Subscriber } from './types';

const URL = 'ws://localhost:1234';
const SECOND_URL = 'ws://localhost:4321'
const noop = () => { };

const subscriber1: Subscriber = {
    setLastMessage: noop,
    setReadyState: noop,
    optionsRef: { current: {} },
    reconnectCount: { current: 0 },
    lastMessageTime: { current: Date.now() },
    reconnect: { current: noop },
};

const subscriber2: Subscriber = {
    setLastMessage: noop,
    setReadyState: noop,
    optionsRef: { current: {} },
    reconnectCount: { current: 0 },
    lastMessageTime: { current: Date.now() },
    reconnect: { current: noop },
};

beforeEach(() => {
    if (hasSubscribers(URL)) {
        getSubscribers(URL).forEach(subscriber => {
            removeSubscriber(URL, subscriber);
        });
    }
});

test('getSubscribers returns the number of subscribers, and if no subscription found for url, returns 0', () => {
    expect(getSubscribers(URL)).toHaveLength(0);
});

test('addSubscriber takes a subscriber and a url and adds to or creates a new subscription', () => {
    addSubscriber(URL, subscriber1);
    expect(getSubscribers(URL)).toHaveLength(1);
    addSubscriber(URL, subscriber2);
    expect(getSubscribers(URL)).toHaveLength(2);
});

test('addSubscriber stores subscribers in a Set, so duplicate subscriptions are not possible', () => {
    addSubscriber(URL, subscriber1);
    expect(getSubscribers(URL)).toHaveLength(1);
    addSubscriber(URL, subscriber1);
    expect(getSubscribers(URL)).toHaveLength(1);
});

test('hasSubscribers returns a boolean indicating whether there are any subscribers by url', () => {
    expect(hasSubscribers(URL)).toBe(false);
    addSubscriber(URL, subscriber1);
    expect(hasSubscribers(URL)).toBe(true);
});

test('removeSubscriber removes a subscriber from a url subscription', () => {
    addSubscriber(URL, subscriber1);
    addSubscriber(URL, subscriber2);
    expect(getSubscribers(URL)).toHaveLength(2);

    removeSubscriber(URL, subscriber1);
    removeSubscriber(URL, subscriber2);
    expect(getSubscribers(URL)).toHaveLength(0);
});

test('resetSubscribers removes subscribers only for a specific URL', () => {
    addSubscriber(URL, subscriber1);
    addSubscriber(URL, subscriber2);
    expect(getSubscribers(URL)).toHaveLength(2);

    addSubscriber(SECOND_URL, subscriber1);
    addSubscriber(SECOND_URL, subscriber2);
    expect(getSubscribers(SECOND_URL)).toHaveLength(2);

    resetSubscribers(URL);

    expect(getSubscribers(URL)).toHaveLength(0);
    expect(getSubscribers(SECOND_URL)).toHaveLength(2);
});

test('resetSubscribers removes all subscribers when URL is not set', () => {
    addSubscriber(URL, subscriber1);
    addSubscriber(URL, subscriber2);
    expect(getSubscribers(URL)).toHaveLength(2);

    addSubscriber(SECOND_URL, subscriber1);
    addSubscriber(SECOND_URL, subscriber2);
    expect(getSubscribers(SECOND_URL)).toHaveLength(2);

    resetSubscribers();

    expect(getSubscribers(URL)).toHaveLength(0);
    expect(getSubscribers(SECOND_URL)).toHaveLength(0);
});
