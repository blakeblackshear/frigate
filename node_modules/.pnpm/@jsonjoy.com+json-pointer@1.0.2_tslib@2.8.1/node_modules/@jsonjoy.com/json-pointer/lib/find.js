"use strict";
/* tslint:disable no-string-throw */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObjectReference = exports.isArrayEnd = exports.isArrayReference = exports.find = void 0;
const hasOwnProperty_1 = require("@jsonjoy.com/util/lib/hasOwnProperty");
const { isArray } = Array;
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
const find = (val, path) => {
    const pathLength = path.length;
    if (!pathLength)
        return { val };
    let obj;
    let key;
    for (let i = 0; i < pathLength; i++) {
        obj = val;
        key = path[i];
        if (isArray(obj)) {
            const length = obj.length;
            if (key === '-')
                key = length;
            else {
                if (typeof key === 'string') {
                    const key2 = ~~key;
                    if ('' + key2 !== key)
                        throw new Error('INVALID_INDEX');
                    key = key2;
                    if (key < 0)
                        throw new Error('INVALID_INDEX');
                }
            }
            val = obj[key];
        }
        else if (typeof obj === 'object' && !!obj) {
            val = (0, hasOwnProperty_1.hasOwnProperty)(obj, key) ? obj[key] : undefined;
        }
        else
            throw new Error('NOT_FOUND');
    }
    const ref = { val, obj, key };
    return ref;
};
exports.find = find;
const isArrayReference = (ref) => isArray(ref.obj) && typeof ref.key === 'number';
exports.isArrayReference = isArrayReference;
const isArrayEnd = (ref) => ref.obj.length === ref.key;
exports.isArrayEnd = isArrayEnd;
const isObjectReference = (ref) => typeof ref.obj === 'object' && typeof ref.key === 'string';
exports.isObjectReference = isObjectReference;
