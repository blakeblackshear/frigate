"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const v10_1 = tslib_1.__importDefault(require("./v10"));
const hasBuffer = typeof Buffer !== 'undefined';
const utf8Slice = hasBuffer ? Buffer.prototype.utf8Slice : null;
const from = hasBuffer ? Buffer.from : null;
exports.default = (buf, start, length) => {
    const end = start + length;
    return length > 8
        ? utf8Slice
            ? utf8Slice.call(buf, start, end)
            : from
                ? from(buf).subarray(start, end).toString('utf8')
                : (0, v10_1.default)(buf, start, length)
        : (0, v10_1.default)(buf, start, length);
};
//# sourceMappingURL=v15.js.map