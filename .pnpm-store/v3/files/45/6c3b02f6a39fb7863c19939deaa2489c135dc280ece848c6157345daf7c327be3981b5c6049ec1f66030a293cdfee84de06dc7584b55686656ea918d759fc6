"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeout = void 0;
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
const timeout = (ms, code) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    const promise = typeof code === 'function' ? code() : code;
    promise.then((result) => {
        clearTimeout(timer);
        resolve(result);
    }, (error) => {
        clearTimeout(timer);
        reject(error);
    });
});
exports.timeout = timeout;
