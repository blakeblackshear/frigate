"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listToUint8 = exports.concatList = exports.concat = void 0;
const concat = (a, b) => {
    const res = new Uint8Array(a.length + b.length);
    res.set(a);
    res.set(b, a.length);
    return res;
};
exports.concat = concat;
const concatList = (list) => {
    const length = list.length;
    let size = 0, offset = 0;
    for (let i = 0; i < length; i++)
        size += list[i].length;
    const res = new Uint8Array(size);
    for (let i = 0; i < length; i++) {
        const item = list[i];
        res.set(item, offset);
        offset += item.length;
    }
    return res;
};
exports.concatList = concatList;
const listToUint8 = (list) => {
    switch (list.length) {
        case 0:
            return new Uint8Array(0);
        case 1:
            return list[0];
        default:
            return (0, exports.concatList)(list);
    }
};
exports.listToUint8 = listToUint8;
//# sourceMappingURL=concat.js.map