"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.of = void 0;
/**
 * Given a promise awaits it and returns a 3-tuple, with the following members:
 *
 * - First entry is either the resolved value of the promise or `undefined`.
 * - Second entry is either the error thrown by promise or `undefined`.
 * - Third entry is a boolean, truthy if promise was resolved and falsy if rejected.
 *
 * @param promise Promise to convert to 3-tuple.
 */
const of = async (promise) => {
    try {
        return [await promise, undefined, true];
    }
    catch (error) {
        return [undefined, error, false];
    }
};
exports.of = of;
