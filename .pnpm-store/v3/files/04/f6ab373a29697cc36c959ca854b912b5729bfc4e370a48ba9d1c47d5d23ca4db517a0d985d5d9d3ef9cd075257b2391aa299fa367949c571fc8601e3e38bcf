"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asString = void 0;
const stringify = JSON.stringify;
const asString = (str) => {
    const length = str.length;
    if (length > 41)
        return stringify(str);
    let result = '';
    let last = 0;
    let found = false;
    let point = 255;
    for (let i = 0; i < length && point >= 32; i++) {
        point = str.charCodeAt(i);
        if (point >= 0xd800 && point <= 0xdfff)
            return stringify(str);
        if (point === 34 || point === 92) {
            result += str.slice(last, i) + '\\';
            last = i;
            found = true;
        }
    }
    if (point < 32)
        return stringify(str);
    return '"' + (!found ? str : result + str.slice(last)) + '"';
};
exports.asString = asString;
//# sourceMappingURL=asString.js.map