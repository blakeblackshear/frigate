"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (uint8, start, length) => {
    const end = start + length;
    let x = start;
    let str = '';
    while (x < end) {
        const b1 = uint8[x++];
        if ((b1 & 0x80) === 0) {
            str += String.fromCharCode(b1);
            continue;
        }
        else if ((b1 & 0xe0) === 0xc0) {
            str += String.fromCharCode(((b1 & 0x1f) << 6) | (uint8[x++] & 0x3f));
        }
        else if ((b1 & 0xf0) === 0xe0) {
            str += String.fromCharCode(((b1 & 0x1f) << 12) | ((uint8[x++] & 0x3f) << 6) | (uint8[x++] & 0x3f));
        }
        else if ((b1 & 0xf8) === 0xf0) {
            const b2 = uint8[x++] & 0x3f;
            const b3 = uint8[x++] & 0x3f;
            const b4 = uint8[x++] & 0x3f;
            let code = ((b1 & 0x07) << 0x12) | (b2 << 0x0c) | (b3 << 0x06) | b4;
            if (code > 0xffff) {
                code -= 0x10000;
                str += String.fromCharCode(((code >>> 10) & 0x3ff) | 0xd800);
                code = 0xdc00 | (code & 0x3ff);
            }
            str += String.fromCharCode(code);
        }
        else {
            str += String.fromCharCode(b1);
        }
    }
    return str;
};
//# sourceMappingURL=v5.js.map