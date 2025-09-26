"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utf8Slice = Buffer.prototype.utf8Slice;
exports.default = (buf, start, length) => utf8Slice.call(buf, start, start + length);
//# sourceMappingURL=v11.js.map