"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArrayBuffer = void 0;
const isArrayBuffer = (value) => {
    return value instanceof ArrayBuffer || toString.call(value) === '[object ArrayBuffer]';
};
exports.isArrayBuffer = isArrayBuffer;
//# sourceMappingURL=isArrayBuffer.js.map