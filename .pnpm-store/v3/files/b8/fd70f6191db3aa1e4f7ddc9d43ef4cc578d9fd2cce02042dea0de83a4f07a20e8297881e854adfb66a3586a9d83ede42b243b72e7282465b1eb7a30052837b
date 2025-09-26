import type { Middleware } from 'redux';
/**
 * The default `isImmutable` function.
 *
 * @public
 */
export declare function isImmutableDefault(value: unknown): boolean;
export declare function trackForMutations(isImmutable: IsImmutableFunc, ignorePaths: IgnorePaths | undefined, obj: any): {
    detectMutations(): {
        wasMutated: boolean;
        path?: string | undefined;
    };
};
declare type IgnorePaths = readonly (string | RegExp)[];
declare type IsImmutableFunc = (value: any) => boolean;
/**
 * Options for `createImmutableStateInvariantMiddleware()`.
 *
 * @public
 */
export interface ImmutableStateInvariantMiddlewareOptions {
    /**
      Callback function to check if a value is considered to be immutable.
      This function is applied recursively to every value contained in the state.
      The default implementation will return true for primitive types
      (like numbers, strings, booleans, null and undefined).
     */
    isImmutable?: IsImmutableFunc;
    /**
      An array of dot-separated path strings that match named nodes from
      the root state to ignore when checking for immutability.
      Defaults to undefined
     */
    ignoredPaths?: IgnorePaths;
    /** Print a warning if checks take longer than N ms. Default: 32ms */
    warnAfter?: number;
    ignore?: string[];
}
/**
 * Creates a middleware that checks whether any state was mutated in between
 * dispatches or during a dispatch. If any mutations are detected, an error is
 * thrown.
 *
 * @param options Middleware options.
 *
 * @public
 */
export declare function createImmutableStateInvariantMiddleware(options?: ImmutableStateInvariantMiddlewareOptions): Middleware;
export {};
