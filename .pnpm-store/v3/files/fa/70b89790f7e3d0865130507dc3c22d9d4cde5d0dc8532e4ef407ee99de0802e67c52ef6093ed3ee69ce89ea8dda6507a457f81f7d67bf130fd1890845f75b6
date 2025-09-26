"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBuf = void 0;
const encode_1 = require("./utf8/encode");
const toBuf = (str) => {
    const maxLength = str.length * 4;
    const arr = new Uint8Array(maxLength);
    const strBufferLength = (0, encode_1.encode)(arr, str, 0, maxLength);
    return arr.slice(0, strBufferLength);
};
exports.toBuf = toBuf;
//# sourceMappingURL=toBuf.js.map