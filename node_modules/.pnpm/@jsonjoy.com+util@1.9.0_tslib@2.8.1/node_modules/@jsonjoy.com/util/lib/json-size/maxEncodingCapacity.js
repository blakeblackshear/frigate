"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxEncodingCapacity = void 0;
const maxEncodingCapacity = (value) => {
    switch (typeof value) {
        case 'number':
            return 22;
        case 'string':
            return 5 + value.length * 5;
        case 'boolean':
            return 5;
        case 'object': {
            if (!value)
                return 4;
            const constructor = value.constructor;
            switch (constructor) {
                case Array: {
                    const arr = value;
                    const length = arr.length;
                    let size = 5 + length * 1;
                    for (let i = arr.length - 1; i >= 0; i--)
                        size += (0, exports.maxEncodingCapacity)(arr[i]);
                    return size;
                }
                case Uint8Array: {
                    return 41 + value.length * 2;
                }
                case Object: {
                    let size = 5;
                    const obj = value;
                    for (const key in obj)
                        if (obj.hasOwnProperty(key))
                            size += 2 + (0, exports.maxEncodingCapacity)(key) + (0, exports.maxEncodingCapacity)(obj[key]);
                    return size;
                }
                default:
                    return 45;
            }
        }
        case 'bigint':
            return 22;
        default:
            return 45;
    }
};
exports.maxEncodingCapacity = maxEncodingCapacity;
//# sourceMappingURL=maxEncodingCapacity.js.map