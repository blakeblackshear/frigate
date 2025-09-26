"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utf8Size = void 0;
function utf8Size(str) {
    const length = str.length;
    let size = 0;
    let pos = 0;
    while (pos < length) {
        let value = str.charCodeAt(pos++);
        if ((value & 0xffffff80) === 0) {
            size++;
            continue;
        }
        else if ((value & 0xfffff800) === 0)
            size += 2;
        else {
            if (value >= 0xd800 && value <= 0xdbff && pos < length) {
                const extra = str.charCodeAt(pos);
                if ((extra & 0xfc00) === 0xdc00)
                    value = (pos++, ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000);
            }
            size += 3 + +((value & 0xffff0000) !== 0);
        }
    }
    return size;
}
exports.utf8Size = utf8Size;
//# sourceMappingURL=utf8.js.map