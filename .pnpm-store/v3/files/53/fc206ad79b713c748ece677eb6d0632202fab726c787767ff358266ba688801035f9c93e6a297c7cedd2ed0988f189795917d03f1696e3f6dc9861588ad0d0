"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fromCharCode = String.fromCharCode;
exports.default = (buf, start, length) => {
    let offset = start;
    const end = offset + length;
    let str = '';
    while (offset < end) {
        const octet1 = buf[offset++];
        if ((octet1 & 0x80) === 0) {
            str += fromCharCode(octet1);
            continue;
        }
        const octet2 = buf[offset++] & 0x3f;
        if ((octet1 & 0xe0) === 0xc0) {
            str += fromCharCode(((octet1 & 0x1f) << 6) | octet2);
            continue;
        }
        const octet3 = buf[offset++] & 0x3f;
        if ((octet1 & 0xf0) === 0xe0) {
            str += fromCharCode(((octet1 & 0x1f) << 12) | (octet2 << 6) | octet3);
            continue;
        }
        if ((octet1 & 0xf8) === 0xf0) {
            const octet4 = buf[offset++] & 0x3f;
            let unit = ((octet1 & 0x07) << 0x12) | (octet2 << 0x0c) | (octet3 << 0x06) | octet4;
            if (unit > 0xffff) {
                unit -= 0x10000;
                const unit0 = ((unit >>> 10) & 0x3ff) | 0xd800;
                unit = 0xdc00 | (unit & 0x3ff);
                str += fromCharCode(unit0, unit);
            }
            else {
                str += fromCharCode(unit);
            }
        }
        else {
            str += fromCharCode(octet1);
        }
    }
    return str;
};
//# sourceMappingURL=v10.js.map