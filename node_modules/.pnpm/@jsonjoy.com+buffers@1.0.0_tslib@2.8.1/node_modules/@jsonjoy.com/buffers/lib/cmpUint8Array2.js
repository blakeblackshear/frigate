"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmpUint8Array2 = void 0;
const cmpUint8Array2 = (a, b) => {
    const len1 = a.length;
    const len2 = b.length;
    const len = Math.min(len1, len2);
    for (let i = 0; i < len; i++) {
        const diffChar = a[i] - b[i];
        if (diffChar !== 0)
            return diffChar;
    }
    return len1 - len2;
};
exports.cmpUint8Array2 = cmpUint8Array2;
//# sourceMappingURL=cmpUint8Array2.js.map