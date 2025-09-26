import type { Code } from './types';
/**
 * Executes only one instance of give code at a time. If other calls come in in
 * parallel, they get resolved to the result of the ongoing execution.
 */
export declare const codeMutex: <T>() => (code: Code<T>) => Promise<T>;
