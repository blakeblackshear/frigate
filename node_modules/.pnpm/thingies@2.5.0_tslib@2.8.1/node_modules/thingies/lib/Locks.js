"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Locks = void 0;
const defaultStore = typeof window === 'object' && window && typeof window.localStorage === 'object' ? window.localStorage : null;
let _locks;
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
class Locks {
    constructor(store = defaultStore || {}, now = Date.now, pfx = 'lock-') {
        this.store = store;
        this.now = now;
        this.pfx = pfx;
    }
    acquire(id, ms = 1000) {
        if (ms <= 0)
            return;
        const key = this.pfx + id;
        const lockUntil = this.store[key];
        const now = this.now();
        const isLocked = lockUntil !== undefined && parseInt(lockUntil, 36) > now;
        if (isLocked)
            return;
        const lockUntilNex = (now + ms).toString(36);
        this.store[key] = lockUntilNex;
        const unlock = () => {
            if (this.store[key] === lockUntilNex)
                delete this.store[key];
        };
        return unlock;
    }
    isLocked(id) {
        const key = this.pfx + id;
        const lockUntil = this.store[key];
        if (lockUntil === undefined)
            return false;
        const now = this.now();
        const lockUntilNum = parseInt(lockUntil, 36);
        return lockUntilNum > now;
    }
    lock(id, ms, timeoutMs = 2 * 1000, checkMs = 10) {
        return async (fn) => {
            const timeout = this.now() + timeoutMs;
            let unlock;
            while (!unlock) {
                unlock = this.acquire(id, ms);
                if (unlock)
                    break;
                await new Promise((r) => setTimeout(r, checkMs));
                if (this.now() > timeout)
                    throw new Error('LOCK_TIMEOUT');
            }
            try {
                return await fn();
            }
            finally {
                unlock();
            }
        };
    }
}
exports.Locks = Locks;
Locks.get = () => {
    if (!_locks)
        _locks = new Locks();
    return _locks;
};
