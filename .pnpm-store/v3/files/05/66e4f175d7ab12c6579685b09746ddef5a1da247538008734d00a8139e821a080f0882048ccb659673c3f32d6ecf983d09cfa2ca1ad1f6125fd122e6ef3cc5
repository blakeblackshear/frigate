"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepMerge = deepMerge;
exports.isObjectNotArray = isObjectNotArray;
/**
 * Check if the variable contains an object strictly rejecting arrays
 * @returns `true` if obj is an object
 */
function isObjectNotArray(obj) {
    return typeof obj === 'object' && obj != null && !Array.isArray(obj);
}
/**
 * Pure function - doesn't mutate either parameter!
 * Merges two objects together deeply, overwriting the properties in first with the properties in second
 * @param first The first object
 * @param second The second object
 * @returns a new object
 */
function deepMerge(first = {}, second = {}) {
    // get the unique set of keys across both objects
    const keys = new Set(Object.keys(first).concat(Object.keys(second)));
    return Array.from(keys).reduce((acc, key) => {
        const firstHasKey = key in first;
        const secondHasKey = key in second;
        const firstValue = first[key];
        const secondValue = second[key];
        if (firstHasKey && secondHasKey) {
            if (isObjectNotArray(firstValue) && isObjectNotArray(secondValue)) {
                // object type
                acc[key] = deepMerge(firstValue, secondValue);
            }
            else {
                // value type
                acc[key] = secondValue;
            }
        }
        else if (firstHasKey) {
            acc[key] = firstValue;
        }
        else {
            acc[key] = secondValue;
        }
        return acc;
    }, {});
}
//# sourceMappingURL=deepMerge.js.map