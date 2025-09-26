"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utf8 = exports.ascii = void 0;
const bufferToUint8Array_1 = require("./bufferToUint8Array");
const ascii = (txt) => {
    if (typeof txt === 'string')
        return (0, exports.ascii)([txt]);
    [txt] = txt;
    const len = txt.length;
    const res = new Uint8Array(len);
    for (let i = 0; i < len; i++)
        res[i] = txt.charCodeAt(i);
    return res;
};
exports.ascii = ascii;
const utf8 = (txt) => {
    if (typeof txt === 'string')
        return (0, exports.utf8)([txt]);
    [txt] = txt;
    return (0, bufferToUint8Array_1.bufferToUint8Array)(Buffer.from(txt, 'utf8'));
};
exports.utf8 = utf8;
//# sourceMappingURL=strings.js.map