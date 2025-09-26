"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xorShift32 = exports.makeXorShift32 = void 0;
const makeXorShift32 = (seed = 1 + Math.round(Math.random() * ((-1 >>> 0) - 1))) => {
    let x = seed | 0;
    return function xorShift32() {
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        return x;
    };
};
exports.makeXorShift32 = makeXorShift32;
exports.xorShift32 = (0, exports.makeXorShift32)();
