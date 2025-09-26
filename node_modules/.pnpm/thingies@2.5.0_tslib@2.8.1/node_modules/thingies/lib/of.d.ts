/**
 * Given a promise awaits it and returns a 3-tuple, with the following members:
 *
 * - First entry is either the resolved value of the promise or `undefined`.
 * - Second entry is either the error thrown by promise or `undefined`.
 * - Third entry is a boolean, truthy if promise was resolved and falsy if rejected.
 *
 * @param promise Promise to convert to 3-tuple.
 */
export declare const of: <T, E = unknown>(promise: Promise<T>) => Promise<[T | undefined, E | undefined, boolean]>;
