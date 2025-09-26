import type { Code } from './types';
/**
 * Waits for given number of milliseconds before timing out. If provided code
 * block does not complete within the given time, the promise will be rejected
 * with `new Error('TIMEOUT')` error.
 *
 * ```ts
 * const result = await timeout(1000, async () => {
 *   return 123;
 * });
 * ```
 *
 * @param ms Number of milliseconds to wait before timing out.
 * @param code Code block or promise to execute.
 * @returns The result of the code block or promise.
 */
export declare const timeout: <T>(ms: number, code: Code<T> | Promise<T>) => Promise<T>;
