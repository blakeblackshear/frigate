"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepEqual = void 0;
const isArray = Array.isArray;
const deepEqual = (a, b) => {
    if (a === b)
        return true;
    let length, i, keys;
    if (isArray(a)) {
        if (!isArray(b))
            return false;
        length = a.length;
        if (length !== b.length)
            return false;
        for (i = length; i-- !== 0;)
            if (!(0, exports.deepEqual)(a[i], b[i]))
                return false;
        return true;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length)
            return false;
        if (isArray(b))
            return false;
        for (i = length; i-- !== 0;) {
            const key = keys[i];
            if (!(0, exports.deepEqual)(a[key], b[key]))
                return false;
        }
        return true;
    }
    return false;
};
exports.deepEqual = deepEqual;
//# sourceMappingURL=v5.js.map