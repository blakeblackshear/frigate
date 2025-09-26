"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferToUint8Array = void 0;
const bufferToUint8Array = (buf) => new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
exports.bufferToUint8Array = bufferToUint8Array;
//# sourceMappingURL=bufferToUint8Array.js.map