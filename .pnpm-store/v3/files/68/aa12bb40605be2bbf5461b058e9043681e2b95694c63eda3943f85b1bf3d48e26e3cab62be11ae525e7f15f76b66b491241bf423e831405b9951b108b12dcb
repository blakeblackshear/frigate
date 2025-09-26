"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promiseMap = void 0;
const noop = () => { };
/**
 * Creates promises of a list of values. Resolves all promises and
 * returns an array of resolved values.
 */
const promiseMap = (values, onValue, onError = noop) => new Promise((resolve) => {
    const length = values.length;
    if (!length) {
        return resolve([]);
    }
    const results = [];
    let resolvedCount = 0;
    for (let i = 0; i < length; i++) {
        const value = values[i];
        const promise = onValue(value);
        promise.then((result) => {
            results[i] = result;
            resolvedCount++;
            if (resolvedCount === length) {
                resolve(results);
            }
        }, (error) => {
            results[i] = null;
            onError(error, value, i);
            resolvedCount++;
            if (resolvedCount === length) {
                resolve(results);
            }
        });
    }
});
exports.promiseMap = promiseMap;
