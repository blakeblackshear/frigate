"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const v10_1 = tslib_1.__importDefault(require("./v10"));
let decode = v10_1.default;
const hasBuffer = typeof Buffer !== 'undefined';
const utf8Slice = hasBuffer ? Buffer.prototype.utf8Slice : null;
if (utf8Slice) {
    decode = (buf, start, length) => length <= 10 ? (0, v10_1.default)(buf, start, length) : utf8Slice.call(buf, start, start + length);
}
else {
    const from = hasBuffer ? Buffer.from : null;
    if (from) {
        decode = (buf, start, length) => length < 30
            ? (0, v10_1.default)(buf, start, length)
            : from(buf)
                .subarray(start, start + length)
                .toString();
    }
    else if (typeof TextDecoder !== 'undefined') {
        const decoder = new TextDecoder();
        decode = (buf, start, length) => length < 150 ? (0, v10_1.default)(buf, start, length) : decoder.decode(buf.subarray(start, start + length));
    }
}
exports.default = decode;
//# sourceMappingURL=v13.js.map