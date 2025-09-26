import type { StoreEnhancer } from 'redux';
export declare const SHOULD_AUTOBATCH = "RTK_autoBatch";
export declare const prepareAutoBatched: <T>() => (payload: T) => {
    payload: T;
    meta: unknown;
};
export declare type AutoBatchOptions = {
    type: 'tick';
} | {
    type: 'timer';
    timeout: number;
} | {
    type: 'raf';
} | {
    type: 'callback';
    queueNotification: (notify: () => void) => void;
};
/**
 * A Redux store enhancer that watches for "low-priority" actions, and delays
 * notifying subscribers until either the queued callback executes or the
 * next "standard-priority" action is dispatched.
 *
 * This allows dispatching multiple "low-priority" actions in a row with only
 * a single subscriber notification to the UI after the sequence of actions
 * is finished, thus improving UI re-render performance.
 *
 * Watches for actions with the `action.meta[SHOULD_AUTOBATCH]` attribute.
 * This can be added to `action.meta` manually, or by using the
 * `prepareAutoBatched` helper.
 *
 * By default, it will queue a notification for the end of the event loop tick.
 * However, you can pass several other options to configure the behavior:
 * - `{type: 'tick'}: queues using `queueMicrotask` (default)
 * - `{type: 'timer, timeout: number}`: queues using `setTimeout`
 * - `{type: 'raf'}`: queues using `requestAnimationFrame`
 * - `{type: 'callback', queueNotification: (notify: () => void) => void}: lets you provide your own callback
 *
 *
 */
export declare const autoBatchEnhancer: (options?: AutoBatchOptions) => StoreEnhancer;
