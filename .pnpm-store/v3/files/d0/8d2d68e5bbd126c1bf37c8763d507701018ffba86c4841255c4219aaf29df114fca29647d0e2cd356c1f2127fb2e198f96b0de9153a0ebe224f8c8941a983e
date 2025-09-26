"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepEqual = void 0;
const isArray = Array.isArray;
const OBJ_PROTO = Object.prototype;
const deepEqual = (a, b) => {
    if (a === b)
        return true;
    let length = 0, i = 0;
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
        specific: {
            if (a.__proto__ === OBJ_PROTO)
                break specific;
            if (a instanceof Uint8Array) {
                if (!(b instanceof Uint8Array))
                    return false;
                const length = a.length;
                if (length !== b.length)
                    return false;
                for (let i = 0; i < length; i++)
                    if (a[i] !== b[i])
                        return false;
                return true;
            }
        }
        const keys = Object.keys(a);
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
//# sourceMappingURL=v6.js.map