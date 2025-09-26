"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepEqual = void 0;
const deepEqual = (a, b) => {
    if (a === b)
        return true;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
        if (a.constructor !== b.constructor)
            return false;
        let length, i, keys;
        if (Array.isArray(a)) {
            length = a.length;
            if (length !== b.length)
                return false;
            for (i = length; i-- !== 0;)
                if (!(0, exports.deepEqual)(a[i], b[i]))
                    return false;
            return true;
        }
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length)
            return false;
        for (i = length; i-- !== 0;)
            if (!Object.prototype.hasOwnProperty.call(b, keys[i]))
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
//# sourceMappingURL=v3.js.map