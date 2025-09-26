"use strict";
/* tslint:disable no-invalid-this */
Object.defineProperty(exports, "__esModule", { value: true });
exports.once = once;
const instances = new WeakMap();
/**
 * A class method decorator that limits a method to be called only once. All
 * subsequent calls will return the result of the first call.
 */
function once(fn, context) {
    return function (...args) {
        let map = instances.get(this);
        if (!map)
            instances.set(this, (map = new WeakMap()));
        if (!map.has(fn))
            map.set(fn, fn.apply(this, args));
        return map.get(fn);
    };
}
