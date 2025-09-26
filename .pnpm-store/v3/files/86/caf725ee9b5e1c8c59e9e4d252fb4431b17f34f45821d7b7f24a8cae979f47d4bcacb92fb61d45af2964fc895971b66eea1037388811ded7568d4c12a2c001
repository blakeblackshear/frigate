import type { AnyFn, Syncify, SynckitOptions } from './types.js';
export * from './common.js';
export * from './constants.js';
export * from './helpers.js';
export * from './types.js';
export declare function createSyncFn<T extends AnyFn>(workerPath: URL | string, timeoutOrOptions?: SynckitOptions | number): Syncify<T>;
export declare function runAsWorker<T extends AnyFn<Promise<R> | R>, R = ReturnType<T>>(fn: T): void;
