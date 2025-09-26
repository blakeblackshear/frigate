import type { Path } from './types';
export interface Reference {
    /** Target value where pointer is pointing. */
    readonly val: unknown;
    /** Object which contains the target value. */
    readonly obj?: unknown | object | unknown[];
    /** Key which targets the target value in the object. */
    readonly key?: string | number;
}
/**
 * Finds a target in document specified by JSON Pointer. Also returns the
 * object containing the target and key used to reference that object.
 *
 * Throws Error('NOT_FOUND') if pointer does not result into a value in the middle
 * of the path. If the last element of the path does not result into a value, the
 * lookup succeeds with `val` set to `undefined`. It can be used to discriminate
 * missing values, because `undefined` is not a valid JSON value.
 *
 * If last element in array is targeted using "-", e.g. "/arr/-", use
 * `isArrayEnd` to verify that:
 *
 * ```js
 * const ref = find({arr: [1, 2, 3], ['arr', '-']});
 * if (isArrayReference(ref)) {
 *   if (isArrayEnd(ref)) {
 *     // ...
 *   }
 * }
 * ```
 *
 * @param skipLast Number of steps to skip at the end. Useful to find reference of
 *   parent step, without constructing a new `Path` array.
 */
export declare const find: (val: unknown, path: Path) => Reference;
export interface ArrayReference<T = unknown> {
    /** `undefined` in case JSON Pointer points to last element, e.g. "/foo/-". */
    readonly val: undefined | T;
    readonly obj: T[];
    readonly key: number;
}
export declare const isArrayReference: <T = unknown>(ref: Reference) => ref is ArrayReference<T>;
export declare const isArrayEnd: (ref: ArrayReference) => boolean;
export interface ObjectReference<T = unknown> {
    readonly val: T;
    readonly obj: Record<string, T>;
    readonly key: string;
}
export declare const isObjectReference: <T = unknown>(ref: Reference) => ref is ObjectReference<T>;
