"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concurrency = concurrency;
const concurrency_1 = require("./concurrency");
/* tslint:disable no-invalid-this */
const instances = new WeakMap();
/**
 * A class method decorator that limits the concurrency of the method to the
 * given number of parallel executions. All invocations are queued and executed
 * in the order they were called.
 */
function concurrency(limit) {
    return (fn, context) => {
        return async function (...args) {
            let map = instances.get(this);
            if (!map)
                instances.set(this, (map = new WeakMap()));
            if (!map.has(fn))
                map.set(fn, (0, concurrency_1.concurrency)(limit));
            return map.get(fn)(async () => await fn.call(this, ...args));
        };
    };
}
