"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fuzzer = void 0;
const crypto_1 = require("crypto");
function xoshiro128ss(a, b, c, d) {
    return () => {
        const t = b << 9;
        let r = b * 5;
        r = ((r << 7) | (r >>> 25)) * 9;
        c ^= a;
        d ^= b;
        b ^= c;
        a ^= d;
        c ^= t;
        d = (d << 11) | (d >>> 21);
        return (r >>> 0) / 4294967296;
    };
}
class Fuzzer {
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    static randomInt2([min, max]) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    static pick(elements) {
        return elements[Math.floor(Math.random() * elements.length)];
    }
    static repeat(times, callback) {
        const result = [];
        for (let i = 0; i < times; i++)
            result.push(callback());
        return result;
    }
    constructor(seed) {
        this.randomInt = (min, max) => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };
        this.pick = (elements) => {
            return elements[Math.floor(Math.random() * elements.length)];
        };
        this.repeat = (times, callback) => {
            const result = [];
            for (let i = 0; i < times; i++)
                result.push(callback());
            return result;
        };
        this.seed = seed = seed || (0, crypto_1.randomBytes)(4 * 4);
        let i = 0;
        const a = (seed[i++] << 24) | (seed[i++] << 16) | (seed[i++] << 8) | seed[i++];
        const b = (seed[i++] << 24) | (seed[i++] << 16) | (seed[i++] << 8) | seed[i++];
        const c = (seed[i++] << 24) | (seed[i++] << 16) | (seed[i++] << 8) | seed[i++];
        const d = (seed[i++] << 24) | (seed[i++] << 16) | (seed[i++] << 8) | seed[i++];
        this.random = xoshiro128ss(a, b, c, d);
        Math.random = this.random;
    }
}
exports.Fuzzer = Fuzzer;
//# sourceMappingURL=Fuzzer.js.map