"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inherits = inherits;
exports.promisify = promisify;
exports.inspect = inspect;
exports.format = format;
/**
 * Minimal implementation of Node.js util.inherits function.
 * Sets up prototype inheritance between constructor functions.
 */
function inherits(ctor, superCtor) {
    if (ctor === undefined || ctor === null) {
        throw new TypeError('The constructor to inherit from is not defined');
    }
    if (superCtor === undefined || superCtor === null) {
        throw new TypeError('The super constructor to inherit from is not defined');
    }
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true,
        },
    });
}
/**
 * Minimal implementation of Node.js util.promisify function.
 * Converts callback-based functions to Promise-based functions.
 */
function promisify(fn) {
    if (typeof fn !== 'function') {
        throw new TypeError('The "original" argument must be of type function');
    }
    return function (...args) {
        return new Promise((resolve, reject) => {
            fn.call(this, ...args, (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    };
}
/**
 * Minimal implementation of Node.js util.inspect function.
 * Converts a value to a string representation for debugging.
 */
function inspect(value) {
    if (value === null)
        return 'null';
    if (value === undefined)
        return 'undefined';
    if (typeof value === 'string')
        return `'${value}'`;
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    if (Array.isArray(value)) {
        const items = value.map(item => inspect(item)).join(', ');
        return `[ ${items} ]`;
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value)
            .map(([key, val]) => `${key}: ${inspect(val)}`)
            .join(', ');
        return `{ ${entries} }`;
    }
    return String(value);
}
/**
 * Minimal implementation of Node.js util.format function.
 * Provides printf-style string formatting with basic placeholder support.
 */
function format(template, ...args) {
    if (args.length === 0)
        return template;
    let result = template;
    let argIndex = 0;
    // Replace %s (string), %d (number), %j (JSON) placeholders
    result = result.replace(/%[sdj%]/g, match => {
        if (argIndex >= args.length)
            return match;
        const arg = args[argIndex++];
        switch (match) {
            case '%s':
                return String(arg);
            case '%d':
                return Number(arg).toString();
            case '%j':
                try {
                    return JSON.stringify(arg);
                }
                catch {
                    return '[Circular]';
                }
            case '%%':
                return '%';
            default:
                return match;
        }
    });
    // Append remaining arguments
    while (argIndex < args.length) {
        result += ' ' + String(args[argIndex++]);
    }
    return result;
}
//# sourceMappingURL=util.js.map