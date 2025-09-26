"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = void 0;
const hasOwnProperty_1 = require("@jsonjoy.com/util/lib/hasOwnProperty");
const get = (val, path) => {
    const pathLength = path.length;
    let key;
    if (!pathLength)
        return val;
    for (let i = 0; i < pathLength; i++) {
        key = path[i];
        if (val instanceof Array) {
            if (typeof key !== 'number') {
                if (key === '-')
                    return undefined;
                const key2 = ~~key;
                if ('' + key2 !== key)
                    return undefined;
                key = key2;
            }
            val = val[key];
        }
        else if (typeof val === 'object') {
            if (!val || !(0, hasOwnProperty_1.hasOwnProperty)(val, key))
                return undefined;
            val = val[key];
        }
        else
            return undefined;
    }
    return val;
};
exports.get = get;
