import { worker } from 'monaco-editor';
/**
 * Change each callback of the type param to a promisified version.
 */
export declare type WorkerImplementation<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Awaited<R> | PromiseLike<Awaited<R>> : never;
};
/**
 * A function for initializing a web worker.
 */
export declare type WebWorkerInitializeFunction<T, C = unknown> = (ctx: worker.IWorkerContext, createData: C) => WorkerImplementation<T>;
/**
 * Create a web worker proxy.
 *
 * @param fn - The function that creates the web worker.
 */
export declare function initialize<T, C = unknown>(fn: WebWorkerInitializeFunction<T, C>): void;
