"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const v10_1 = tslib_1.__importDefault(require("./v10"));
const hasBuffer = typeof Buffer !== 'undefined';
const utf8Slice = hasBuffer ? Buffer.prototype.utf8Slice : null;
exports.default = utf8Slice
    ? (buf, start, length) => utf8Slice.call(buf, start, start + length)
    : v10_1.default;
//# sourceMappingURL=v14.js.map