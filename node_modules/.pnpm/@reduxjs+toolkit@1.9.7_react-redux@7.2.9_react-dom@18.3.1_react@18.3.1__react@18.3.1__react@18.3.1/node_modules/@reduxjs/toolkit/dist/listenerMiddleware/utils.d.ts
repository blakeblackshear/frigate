export declare const assertFunction: (func: unknown, expected: string) => asserts func is (...args: unknown[]) => unknown;
export declare const noop: () => void;
export declare const catchRejection: <T>(promise: Promise<T>, onError?: () => void) => Promise<T>;
export declare const addAbortSignalListener: (abortSignal: AbortSignal, callback: (evt: Event) => void) => () => void;
/**
 * Calls `abortController.abort(reason)` and patches `signal.reason`.
 * if it is not supported.
 *
 * At the time of writing `signal.reason` is available in FF chrome, edge node 17 and deno.
 * @param abortController
 * @param reason
 * @returns
 * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/reason
 */
export declare const abortControllerWithReason: <T>(abortController: AbortController, reason: T) => void;
