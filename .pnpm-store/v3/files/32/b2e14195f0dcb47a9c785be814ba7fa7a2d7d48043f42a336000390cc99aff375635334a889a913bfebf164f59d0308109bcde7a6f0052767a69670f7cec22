"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encode = exports.encodeTe = exports.encodeNative = exports.encodeFrom = exports.encodeUtf8Write = void 0;
const hasBuffer = typeof Buffer !== undefined;
const utf8Write = hasBuffer
    ? Buffer.prototype.utf8Write
    : null;
const from = hasBuffer ? Buffer.from : null;
const encodeUtf8Write = (arr, str, pos, maxLength) => utf8Write.call(arr, str, pos, maxLength);
exports.encodeUtf8Write = encodeUtf8Write;
const encodeFrom = (arr, str, pos, maxLength) => {
    const offset = arr.byteOffset + pos;
    const buf = from(arr.buffer).subarray(offset, offset + maxLength);
    return buf.write(str, 0, maxLength, 'utf8');
};
exports.encodeFrom = encodeFrom;
const encodeNative = (arr, str, pos, maxLength) => {
    const length = str.length;
    const start = pos;
    let curr = 0;
    while (curr < length) {
        let value = str.charCodeAt(curr++);
        if ((value & 0xffffff80) === 0) {
            arr[pos++] = value;
            continue;
        }
        else if ((value & 0xfffff800) === 0) {
            arr[pos++] = ((value >> 6) & 0x1f) | 0xc0;
        }
        else {
            if (value >= 0xd800 && value <= 0xdbff) {
                if (curr < length) {
                    const extra = str.charCodeAt(curr);
                    if ((extra & 0xfc00) === 0xdc00) {
                        curr++;
                        value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
                    }
                }
            }
            if ((value & 0xffff0000) === 0) {
                arr[pos++] = ((value >> 12) & 0x0f) | 0xe0;
                arr[pos++] = ((value >> 6) & 0x3f) | 0x80;
            }
            else {
                arr[pos++] = ((value >> 18) & 0x07) | 0xf0;
                arr[pos++] = ((value >> 12) & 0x3f) | 0x80;
                arr[pos++] = ((value >> 6) & 0x3f) | 0x80;
            }
        }
        arr[pos++] = (value & 0x3f) | 0x80;
    }
    return pos - start;
};
exports.encodeNative = encodeNative;
const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const encodeTe = (arr, str, pos, maxLength) => textEncoder.encodeInto(str, arr.subarray(pos, pos + maxLength)).written;
exports.encodeTe = encodeTe;
exports.encode = utf8Write ? exports.encodeUtf8Write : from ? exports.encodeFrom : exports.encodeNative;
//# sourceMappingURL=encode.js.map