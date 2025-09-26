"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonSizeFast = void 0;
const arraySize = (arr) => {
    let size = 2;
    for (let i = arr.length - 1; i >= 0; i--)
        size += (0, exports.jsonSizeFast)(arr[i]);
    return size;
};
const objectSize = (obj) => {
    let size = 2;
    for (const key in obj)
        if (obj.hasOwnProperty(key))
            size += 2 + key.length + (0, exports.jsonSizeFast)(obj[key]);
    return size;
};
const jsonSizeFast = (value) => {
    if (value === null)
        return 1;
    switch (typeof value) {
        case 'number':
            return 9;
        case 'string':
            return 4 + value.length;
        case 'boolean':
            return 1;
    }
    if (value instanceof Array)
        return arraySize(value);
    return objectSize(value);
};
exports.jsonSizeFast = jsonSizeFast;
//# sourceMappingURL=jsonSizeFast.js.map