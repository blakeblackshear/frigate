"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mutex = mutex;
const codeMutex_1 = require("./codeMutex");
/* tslint:disable no-invalid-this */
/**
 * Executes only one instance of give code at a time. For parallel calls, it
 * returns the result of the ongoing execution.
 */
function mutex(fn, context) {
    const isDecorator = !!context;
    if (!isDecorator) {
        const mut = (0, codeMutex_1.codeMutex)();
        return async function (...args) {
            return await mut(async () => await fn.call(this, ...args));
        };
    }
    const instances = new WeakMap();
    return async function (...args) {
        let map = instances.get(this);
        if (!map)
            instances.set(this, (map = new WeakMap()));
        if (!map.has(fn))
            map.set(fn, (0, codeMutex_1.codeMutex)());
        return await map.get(fn)(async () => await fn.call(this, ...args));
    };
}
