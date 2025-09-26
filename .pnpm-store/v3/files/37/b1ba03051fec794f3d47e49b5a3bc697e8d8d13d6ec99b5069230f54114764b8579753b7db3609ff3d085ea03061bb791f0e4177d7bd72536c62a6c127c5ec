"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBinary = void 0;
const printBinary = (tab = '', children) => {
    const left = children[0], right = children[1];
    let str = '';
    if (left)
        str += '\n' + tab + '← ' + left(tab + '  ');
    if (right)
        str += '\n' + tab + '→ ' + right(tab + '  ');
    return str;
};
exports.printBinary = printBinary;
