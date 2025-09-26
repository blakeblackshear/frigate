"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonSizeApprox = exports.jsonSize = void 0;
const utf8_1 = require("../strings/utf8");
const numberSize = (num) => {
    const isInteger = num === Math.round(num);
    if (isInteger)
        return Math.max(Math.floor(Math.log10(Math.abs(num))), 0) + 1 + (num < 0 ? 1 : 0);
    return JSON.stringify(num).length;
};
const stringSize = (str) => {
    const strLength = str.length;
    let byteLength = strLength;
    let pos = 0;
    while (pos < strLength) {
        const value = str.charCodeAt(pos++);
        if (value < 128) {
            switch (value) {
                case 8:
                case 9:
                case 10:
                case 12:
                case 13:
                case 34:
                case 92:
                    byteLength += 1;
                    break;
            }
            continue;
        }
        else
            return (0, utf8_1.utf8Size)(JSON.stringify(str));
    }
    return byteLength + 2;
};
const booleanSize = (bool) => (bool ? 4 : 5);
const arraySize = (arr) => {
    let size = 0;
    const length = arr.length;
    for (let i = 0; i < length; i++)
        size += (0, exports.jsonSize)(arr[i]);
    return size + 2 + (length > 1 ? length - 1 : 0);
};
const objectSize = (obj) => {
    let size = 2;
    let length = 0;
    for (const key in obj)
        if (obj.hasOwnProperty(key)) {
            length++;
            size += stringSize(key) + (0, exports.jsonSize)(obj[key]);
        }
    const colonSize = length;
    const commaSize = length > 1 ? length - 1 : 0;
    return size + colonSize + commaSize;
};
const jsonSize = (value) => {
    if (value === null)
        return 4;
    switch (typeof value) {
        case 'number':
            return numberSize(value);
        case 'string':
            return stringSize(value);
        case 'boolean':
            return booleanSize(value);
    }
    if (value instanceof Array)
        return arraySize(value);
    return objectSize(value);
};
exports.jsonSize = jsonSize;
const jsonSizeApprox = (value) => {
    if (value === null)
        return 4;
    switch (typeof value) {
        case 'number':
            return numberSize(value);
        case 'string':
            return value.length;
        case 'boolean':
            return booleanSize(value);
    }
    if (value instanceof Array)
        return arraySize(value);
    return objectSize(value);
};
exports.jsonSizeApprox = jsonSizeApprox;
//# sourceMappingURL=json.js.map