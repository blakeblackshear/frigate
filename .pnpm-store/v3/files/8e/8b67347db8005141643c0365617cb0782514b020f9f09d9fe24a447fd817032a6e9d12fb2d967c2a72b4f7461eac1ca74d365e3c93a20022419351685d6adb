"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clone = void 0;
const { isArray } = Array;
const objectKeys = Object.keys;
const clone = (obj) => {
    if (!obj)
        return obj;
    if (isArray(obj)) {
        const arr = [];
        const length = obj.length;
        for (let i = 0; i < length; i++)
            arr.push((0, exports.clone)(obj[i]));
        return arr;
    }
    else if (typeof obj === 'object') {
        const keys = objectKeys(obj);
        const length = keys.length;
        const newObject = {};
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            newObject[key] = (0, exports.clone)(obj[key]);
        }
        return newObject;
    }
    return obj;
};
exports.clone = clone;
//# sourceMappingURL=clone.js.map