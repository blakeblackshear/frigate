"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const decodeAscii_1 = require("../decodeAscii");
const v18_1 = tslib_1.__importDefault(require("./v18"));
const hasBuffer = typeof Buffer !== 'undefined';
const utf8Slice = hasBuffer ? Buffer.prototype.utf8Slice : null;
const from = hasBuffer ? Buffer.from : null;
const shortDecoder = (buf, start, length) => (0, decodeAscii_1.decodeAsciiMax15)(buf, start, length) ?? (0, v18_1.default)(buf, start, length);
const midDecoder = (buf, start, length) => (0, decodeAscii_1.decodeAscii)(buf, start, length) ?? (0, v18_1.default)(buf, start, length);
const longDecoder = utf8Slice
    ? (buf, start, length) => utf8Slice.call(buf, start, start + length)
    : from
        ? (buf, start, length) => from(buf)
            .subarray(start, start + length)
            .toString('utf8')
        : v18_1.default;
const decoder = (buf, start, length) => {
    if (length < 16)
        return shortDecoder(buf, start, length);
    if (length < 32)
        return midDecoder(buf, start, length);
    return longDecoder(buf, start, length);
};
exports.default = decoder;
//# sourceMappingURL=v16.js.map