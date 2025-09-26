"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUtf8 = void 0;
const tslib_1 = require("tslib");
tslib_1.__exportStar(require("@jsonjoy.com/buffers/lib/utf8/isUtf8"), exports);
const isUtf8 = (buf, from, length) => {
    const to = from + length;
    while (from < to) {
        const c = buf[from];
        if (c <= 0x7f) {
            from++;
            continue;
        }
        if (c >= 0xc2 && c <= 0xdf) {
            if (buf[from + 1] >> 6 === 2) {
                from += 2;
                continue;
            }
            else
                return false;
        }
        const c1 = buf[from + 1];
        if (((c === 0xe0 && c1 >= 0xa0 && c1 <= 0xbf) || (c === 0xed && c1 >= 0x80 && c1 <= 0x9f)) &&
            buf[from + 2] >> 6 === 2) {
            from += 3;
            continue;
        }
        if (((c >= 0xe1 && c <= 0xec) || (c >= 0xee && c <= 0xef)) && c1 >> 6 === 2 && buf[from + 2] >> 6 === 2) {
            from += 3;
            continue;
        }
        if (((c === 0xf0 && c1 >= 0x90 && c1 <= 0xbf) ||
            (c >= 0xf1 && c <= 0xf3 && c1 >> 6 === 2) ||
            (c === 0xf4 && c1 >= 0x80 && c1 <= 0x8f)) &&
            buf[from + 2] >> 6 === 2 &&
            buf[from + 3] >> 6 === 2) {
            from += 4;
            continue;
        }
        return false;
    }
    return true;
};
exports.isUtf8 = isUtf8;
//# sourceMappingURL=isUtf8.js.map