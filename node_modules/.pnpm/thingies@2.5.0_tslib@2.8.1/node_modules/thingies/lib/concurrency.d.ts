import type { Code } from './types';
/** Limits concurrency of async code. */
export declare const concurrency: (limit: number) => <T = unknown>(code: Code<T>) => Promise<T>;
