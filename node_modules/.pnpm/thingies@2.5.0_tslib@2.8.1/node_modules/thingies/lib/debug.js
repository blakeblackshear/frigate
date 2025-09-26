"use strict";
/* tslint:disable no-invalid-this no-console */
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = debug;
let id = 0;
function debug(name) {
    return (fn, context) => {
        if (process.env.NODE_ENV !== 'production') {
            return function (...args) {
                id++;
                const idStr = id.toString(36);
                const currentName = name ?? (this ? this.constructor?.name + '.' : '') + (String(context?.name) ?? fn.name ?? 'anonymous');
                console.log('%cRUN', 'background:white;color:blue', idStr, currentName, ...args);
                try {
                    const res = fn.apply(this, args);
                    if (res instanceof Promise) {
                        res.then((res) => console.log('%cSUC', 'background:green;color:white', idStr, currentName, res), (err) => console.log('%cERR', 'background:red;color:white', idStr, currentName, err));
                        return res;
                    }
                    console.log('%cSUC', 'background:green;color:white', idStr, currentName, res);
                    return res;
                }
                catch (err) {
                    console.log('%cERR', 'background:red;color:white', idStr, currentName, err);
                    throw err;
                }
            };
        }
        return fn;
    };
}
