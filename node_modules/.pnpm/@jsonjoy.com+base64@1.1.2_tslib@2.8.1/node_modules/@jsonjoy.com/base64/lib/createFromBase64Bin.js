"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFromBase64Bin = void 0;
const constants_1 = require("./constants");
const createFromBase64Bin = (chars = constants_1.alphabet, pad = '=') => {
    if (chars.length !== 64)
        throw new Error('chars must be 64 characters long');
    let max = 0;
    for (let i = 0; i < chars.length; i++)
        max = Math.max(max, chars.charCodeAt(i));
    const table = [];
    for (let i = 0; i <= max; i += 1)
        table[i] = -1;
    for (let i = 0; i < chars.length; i++)
        table[chars.charCodeAt(i)] = i;
    const doExpectPadding = pad.length === 1;
    const PAD = doExpectPadding ? pad.charCodeAt(0) : 0;
    return (view, offset, length) => {
        if (!length)
            return new Uint8Array(0);
        let padding = 0;
        if (length % 4 !== 0) {
            padding = 4 - (length % 4);
            length += padding;
        }
        else {
            const end = offset + length;
            const last = end - 1;
            if (view.getUint8(last) === PAD) {
                padding = 1;
                if (length > 1 && view.getUint8(last - 1) === PAD)
                    padding = 2;
            }
        }
        if (length % 4 !== 0)
            throw new Error('Base64 string length must be a multiple of 4');
        const mainEnd = offset + length - (padding ? 4 : 0);
        const bufferLength = (length >> 2) * 3 - padding;
        const buf = new Uint8Array(bufferLength);
        let j = 0;
        let i = offset;
        for (; i < mainEnd; i += 4) {
            const word = view.getUint32(i);
            const octet0 = word >>> 24;
            const octet1 = (word >>> 16) & 0xff;
            const octet2 = (word >>> 8) & 0xff;
            const octet3 = word & 0xff;
            const sextet0 = table[octet0];
            const sextet1 = table[octet1];
            const sextet2 = table[octet2];
            const sextet3 = table[octet3];
            if (sextet0 < 0 || sextet1 < 0 || sextet2 < 0 || sextet3 < 0)
                throw new Error('INVALID_BASE64_SEQ');
            buf[j] = (sextet0 << 2) | (sextet1 >> 4);
            buf[j + 1] = (sextet1 << 4) | (sextet2 >> 2);
            buf[j + 2] = (sextet2 << 6) | sextet3;
            j += 3;
        }
        if (!padding)
            return buf;
        if (padding === 1) {
            const word = view.getUint16(mainEnd);
            const octet0 = word >> 8;
            const octet1 = word & 0xff;
            const octet2 = view.getUint8(mainEnd + 2);
            const sextet0 = table[octet0];
            const sextet1 = table[octet1];
            const sextet2 = table[octet2];
            if (sextet0 < 0 || sextet1 < 0 || sextet2 < 0)
                throw new Error('INVALID_BASE64_SEQ');
            buf[j] = (sextet0 << 2) | (sextet1 >> 4);
            buf[j + 1] = (sextet1 << 4) | (sextet2 >> 2);
            return buf;
        }
        const word = view.getUint16(mainEnd);
        const octet0 = word >> 8;
        const octet1 = word & 0xff;
        const sextet0 = table[octet0];
        const sextet1 = table[octet1];
        if (sextet0 < 0 || sextet1 < 0)
            throw new Error('INVALID_BASE64_SEQ');
        buf[j] = (sextet0 << 2) | (sextet1 >> 4);
        return buf;
    };
};
exports.createFromBase64Bin = createFromBase64Bin;
//# sourceMappingURL=createFromBase64Bin.js.map