"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUint8Array = void 0;
exports.isUint8Array = typeof Buffer === 'function'
    ? (x) => x instanceof Uint8Array || Buffer.isBuffer(x)
    : (x) => x instanceof Uint8Array;
//# sourceMappingURL=isUint8Array.js.map