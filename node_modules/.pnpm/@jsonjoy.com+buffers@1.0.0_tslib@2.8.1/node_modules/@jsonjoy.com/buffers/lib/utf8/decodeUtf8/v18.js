"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fromCharCode = String.fromCharCode;
exports.default = (buf, start, length) => {
    let offset = start;
    const end = offset + length;
    const points = [];
    while (offset < end) {
        let code = buf[offset++];
        if ((code & 0x80) !== 0) {
            const octet2 = buf[offset++] & 0x3f;
            if ((code & 0xe0) === 0xc0) {
                code = ((code & 0x1f) << 6) | octet2;
            }
            else {
                const octet3 = buf[offset++] & 0x3f;
                if ((code & 0xf0) === 0xe0) {
                    code = ((code & 0x1f) << 12) | (octet2 << 6) | octet3;
                }
                else {
                    if ((code & 0xf8) === 0xf0) {
                        const octet4 = buf[offset++] & 0x3f;
                        let unit = ((code & 0x07) << 0x12) | (octet2 << 0x0c) | (octet3 << 0x06) | octet4;
                        if (unit > 0xffff) {
                            unit -= 0x10000;
                            const unit0 = ((unit >>> 10) & 0x3ff) | 0xd800;
                            code = 0xdc00 | (unit & 0x3ff);
                            points.push(unit0);
                        }
                        else {
                            code = unit;
                        }
                    }
                }
            }
        }
        points.push(code);
    }
    return fromCharCode.apply(String, points);
};
//# sourceMappingURL=v18.js.map