"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeF16 = void 0;
const pow = Math.pow;
const decodeF16 = (binary) => {
    const exponent = (binary & 0x7c00) >> 10;
    const fraction = binary & 0x03ff;
    return ((binary >> 15 ? -1 : 1) *
        (exponent
            ? exponent === 0x1f
                ? fraction
                    ? NaN
                    : Infinity
                : pow(2, exponent - 15) * (1 + fraction / 0x400)
            : 6.103515625e-5 * (fraction / 0x400)));
};
exports.decodeF16 = decodeF16;
//# sourceMappingURL=f16.js.map