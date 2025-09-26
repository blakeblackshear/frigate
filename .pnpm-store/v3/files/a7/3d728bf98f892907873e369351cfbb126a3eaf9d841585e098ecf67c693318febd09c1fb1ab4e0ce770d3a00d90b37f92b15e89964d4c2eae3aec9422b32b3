"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUint8Array = void 0;
const toUint8Array = (data) => {
    if (data instanceof Uint8Array)
        return data;
    if (data instanceof ArrayBuffer)
        return new Uint8Array(data);
    if (Array.isArray(data))
        return new Uint8Array(data);
    if (typeof Buffer === 'function') {
        if (Buffer.isBuffer(data))
            return data;
        return Buffer.from(data);
    }
    throw new Error('UINT8ARRAY_INCOMPATIBLE');
};
exports.toUint8Array = toUint8Array;
//# sourceMappingURL=toUint8Array.js.map