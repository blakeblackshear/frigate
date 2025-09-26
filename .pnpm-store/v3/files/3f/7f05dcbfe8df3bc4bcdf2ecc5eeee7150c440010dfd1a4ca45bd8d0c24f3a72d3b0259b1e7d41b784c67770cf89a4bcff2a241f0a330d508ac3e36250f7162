import type { Middleware } from 'redux';
/**
 * Returns true if the passed value is "plain", i.e. a value that is either
 * directly JSON-serializable (boolean, number, string, array, plain object)
 * or `undefined`.
 *
 * @param val The value to check.
 *
 * @public
 */
export declare function isPlain(val: any): boolean;
interface NonSerializableValue {
    keyPath: string;
    value: unknown;
}
declare type IgnorePaths = readonly (string | RegExp)[];
/**
 * @public
 */
export declare function findNonSerializableValue(value: unknown, path?: string, isSerializable?: (value: unknown) => boolean, getEntries?: (value: unknown) => [string, any][], ignoredPaths?: IgnorePaths, cache?: WeakSet<object>): NonSerializableValue | false;
export declare function isNestedFrozen(value: object): boolean;
/**
 * Options for `createSerializableStateInvariantMiddleware()`.
 *
 * @public
 */
export interface SerializableStateInvariantMiddlewareOptions {
    /**
     * The function to check if a value is considered serializable. This
     * function is applied recursively to every value contained in the
     * state. Defaults to `isPlain()`.
     */
    isSerializable?: (value: any) => boolean;
    /**
     * The function that will be used to retrieve entries from each
     * value.  If unspecified, `Object.entries` will be used. Defaults
     * to `undefined`.
     */
    getEntries?: (value: any) => [string, any][];
    /**
     * An array of action types to ignore when checking for serializability.
     * Defaults to []
     */
    ignoredActions?: string[];
    /**
     * An array of dot-separated path strings or regular expressions to ignore
     * when checking for serializability, Defaults to
     * ['meta.arg', 'meta.baseQueryMeta']
     */
    ignoredActionPaths?: (string | RegExp)[];
    /**
     * An array of dot-separated path strings or regular expressions to ignore
     * when checking for serializability, Defaults to []
     */
    ignoredPaths?: (string | RegExp)[];
    /**
     * Execution time warning threshold. If the middleware takes longer
     * than `warnAfter` ms, a warning will be displayed in the console.
     * Defaults to 32ms.
     */
    warnAfter?: number;
    /**
     * Opt out of checking state. When set to `true`, other state-related params will be ignored.
     */
    ignoreState?: boolean;
    /**
     * Opt out of checking actions. When set to `true`, other action-related params will be ignored.
     */
    ignoreActions?: boolean;
    /**
     * Opt out of caching the results. The cache uses a WeakSet and speeds up repeated checking processes.
     * The cache is automatically disabled if no browser support for WeakSet is present.
     */
    disableCache?: boolean;
}
/**
 * Creates a middleware that, after every state change, checks if the new
 * state is serializable. If a non-serializable value is found within the
 * state, an error is printed to the console.
 *
 * @param options Middleware options.
 *
 * @public
 */
export declare function createSerializableStateInvariantMiddleware(options?: SerializableStateInvariantMiddlewareOptions): Middleware;
export {};
