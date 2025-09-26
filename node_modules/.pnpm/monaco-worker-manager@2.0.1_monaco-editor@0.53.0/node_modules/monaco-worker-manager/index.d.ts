import { IDisposable, Uri } from 'monaco-editor';
/**
 * Change each callback of the type param to a promisified version.
 */
export declare type PromisifiedWorker<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : never;
};
/**
 * A function for getting the worker client proxy with synchronized resources.
 *
 * @param args - The resource uris to synchronize.
 * @returns The worker client proxy.
 */
export declare type WorkerGetter<T> = (...args: Uri[]) => Promise<PromisifiedWorker<T>>;
export interface WorkerManagerOptions<C> {
    /**
     * The data to send over when creating the worker.
     */
    createData?: C;
    /**
     * How often to check if a worker is idle in milliseconds.
     *
     * @default 30_000 // 30 seconds
     */
    interval?: number;
    /**
     * A label to be used to identify the web worker.
     */
    label: string;
    /**
     * The module to be used to identify the web worker.
     */
    moduleId: string;
    /**
     * The worker is stopped after this time has passed in milliseconds.
     *
     * Set to Infinity to never stop the worker.
     *
     * @default 120_000 // 2 minutes
     */
    stopWhenIdleFor?: number;
}
export interface WorkerManager<T, C = unknown> extends IDisposable {
    /**
     * A function for getting the worker client proxy with synchronized resources.
     *
     * @param args - The resource uris to synchronize.
     * @returns The worker client proxy.
     */
    getWorker: WorkerGetter<T>;
    /**
     * Reload the worker with new create data.
     */
    updateCreateData: (createData: C) => void;
}
/**
 * Create a worker manager.
 *
 * A worker manager is an object which deals with Monaco based web workers, such as cleanups and
 * idle timeouts.
 *
 * @param monaco - The Monaco editor module.
 * @param options - The options of the worker manager.
 * @returns The worker manager.
 */
export declare function createWorkerManager<T, C = unknown>(monaco: Pick<typeof import('monaco-editor'), 'editor'>, options: WorkerManagerOptions<C>): WorkerManager<T, C>;
