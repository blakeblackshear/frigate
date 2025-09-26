"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (buf, start, length) => {
    let offset = start;
    const end = offset + length;
    const codes = [];
    while (offset < end) {
        const octet1 = buf[offset++];
        if ((octet1 & 0x80) === 0) {
            codes.push(octet1);
        }
        else if ((octet1 & 0xe0) === 0xc0) {
            const octet2 = buf[offset++] & 0x3f;
            codes.push(((octet1 & 0x1f) << 6) | octet2);
        }
        else if ((octet1 & 0xf0) === 0xe0) {
            const octet2 = buf[offset++] & 0x3f;
            const octet3 = buf[offset++] & 0x3f;
            codes.push(((octet1 & 0x1f) << 12) | (octet2 << 6) | octet3);
        }
        else if ((octet1 & 0xf8) === 0xf0) {
            const octet2 = buf[offset++] & 0x3f;
            const octet3 = buf[offset++] & 0x3f;
            const octet4 = buf[offset++] & 0x3f;
            let unit = ((octet1 & 0x07) << 0x12) | (octet2 << 0x0c) | (octet3 << 0x06) | octet4;
            if (unit > 0xffff) {
                unit -= 0x10000;
                codes.push(((unit >>> 10) & 0x3ff) | 0xd800);
                unit = 0xdc00 | (unit & 0x3ff);
            }
            codes.push(unit);
        }
        else {
            codes.push(octet1);
        }
    }
    return String.fromCharCode(...codes);
};
//# sourceMappingURL=v7.js.map