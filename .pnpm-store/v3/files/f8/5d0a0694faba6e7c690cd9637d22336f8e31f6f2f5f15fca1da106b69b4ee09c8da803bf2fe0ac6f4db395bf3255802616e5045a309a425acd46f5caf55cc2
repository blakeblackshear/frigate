/**
 * An externally resolvable/rejectable "promise". Use it to resolve/reject
 * promise at any time.
 *
 * ```ts
 * const future = new Defer();
 *
 * future.promise.then(value => console.log(value));
 *
 * future.resolve(123);
 * ```
 */
export declare class Defer<T> {
    readonly resolve: (data: T) => void;
    readonly reject: (error: any) => void;
    readonly promise: Promise<T>;
}
