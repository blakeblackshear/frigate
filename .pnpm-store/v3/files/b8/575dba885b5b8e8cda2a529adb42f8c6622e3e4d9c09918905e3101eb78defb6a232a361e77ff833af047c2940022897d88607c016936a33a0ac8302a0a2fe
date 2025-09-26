"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (buf, start, length) => {
    let offset = start;
    const end = offset + length;
    const units = [];
    let result = '';
    while (offset < end) {
        const byte1 = buf[offset++];
        if ((byte1 & 0x80) === 0) {
            units.push(byte1);
        }
        else if ((byte1 & 0xe0) === 0xc0) {
            const byte2 = buf[offset++] & 0x3f;
            units.push(((byte1 & 0x1f) << 6) | byte2);
        }
        else if ((byte1 & 0xf0) === 0xe0) {
            const byte2 = buf[offset++] & 0x3f;
            const byte3 = buf[offset++] & 0x3f;
            units.push(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
        }
        else if ((byte1 & 0xf8) === 0xf0) {
            const byte2 = buf[offset++] & 0x3f;
            const byte3 = buf[offset++] & 0x3f;
            const byte4 = buf[offset++] & 0x3f;
            let unit = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
            if (unit > 0xffff) {
                unit -= 0x10000;
                units.push(((unit >>> 10) & 0x3ff) | 0xd800);
                unit = 0xdc00 | (unit & 0x3ff);
            }
            units.push(unit);
        }
        else {
            units.push(byte1);
        }
        if (units.length >= 1000) {
            result += String.fromCharCode(...units);
            units.length = 0;
        }
    }
    if (units.length > 0)
        result += String.fromCharCode(...units);
    return result;
};
//# sourceMappingURL=v1.js.map