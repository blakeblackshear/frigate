"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copy = void 0;
const copy = (arr) => {
    const dupe = new Uint8Array(arr.length);
    dupe.set(arr);
    return dupe;
};
exports.copy = copy;
//# sourceMappingURL=copy.js.map