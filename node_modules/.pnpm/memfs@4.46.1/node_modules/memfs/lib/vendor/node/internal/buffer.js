"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferFrom = exports.bufferAllocUnsafe = exports.Buffer = void 0;
const buffer_1 = require("../buffer");
Object.defineProperty(exports, "Buffer", { enumerable: true, get: function () { return buffer_1.Buffer; } });
function bufferV0P12Ponyfill(arg0, ...args) {
    return new buffer_1.Buffer(arg0, ...args);
}
const bufferAllocUnsafe = buffer_1.Buffer.allocUnsafe || bufferV0P12Ponyfill;
exports.bufferAllocUnsafe = bufferAllocUnsafe;
const bufferFrom = buffer_1.Buffer.from || bufferV0P12Ponyfill;
exports.bufferFrom = bufferFrom;
//# sourceMappingURL=buffer.js.map