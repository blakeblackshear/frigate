"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findEndingQuote = void 0;
const findEndingQuote = (uint8, x) => {
    const len = uint8.length;
    let char = uint8[x];
    let prev = 0;
    while (x < len) {
        if (char === 34 && prev !== 92)
            break;
        if (char === 92 && prev === 92)
            prev = 0;
        else
            prev = char;
        char = uint8[++x];
    }
    if (x === len)
        throw new Error('Invalid JSON');
    return x;
};
exports.findEndingQuote = findEndingQuote;
//# sourceMappingURL=util.js.map