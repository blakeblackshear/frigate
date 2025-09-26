/**
 * Creates a lock manager, which can create exclusive locks across browser tabs.
 * Uses `window.localStorage` by default to lock across tabs.
 *
 * Below example, will wait for 5 seconds to acquire a lock, and then execute
 * the function once lock is acquired and release the lock after function
 * execution. It will fail with `LOCK_TIMEOUT` error if lock is not acquired
 * within the 5 seconds. The lock will acquired for 2 seconds (default 1000ms).
 *
 * ```ts
 * Locks.get().lock('my-lock', 2000, 5000)(async () => {
 *   console.log('Lock acquired');
 * });
 * ```
 */
export declare class Locks {
    protected readonly store: Record<string, string>;
    protected readonly now: () => number;
    protected readonly pfx: string;
    static get: () => Locks;
    constructor(store?: Record<string, string>, now?: () => number, pfx?: string);
    acquire(id: string, ms?: number): (() => void) | undefined;
    isLocked(id: string): boolean;
    lock(id: string, ms?: number, timeoutMs?: number, checkMs?: number): <T>(fn: () => Promise<T>) => Promise<T>;
}
