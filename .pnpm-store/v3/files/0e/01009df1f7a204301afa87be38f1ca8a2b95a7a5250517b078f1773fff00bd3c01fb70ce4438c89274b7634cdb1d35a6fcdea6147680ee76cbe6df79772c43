"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printOctets = void 0;
const printOctets = (octets, max = 16) => {
    let str = '';
    if (!octets.length)
        return str;
    if (octets[0] < 16)
        str += '0';
    str += octets[0].toString(16);
    for (let i = 1; i < octets.length && i < max; i++) {
        const n = octets[i];
        str += ' ';
        if (n < 16)
            str += '0';
        str += n.toString(16);
    }
    if (octets.length > max)
        str += `… (${octets.length - max} more)`;
    return str;
};
exports.printOctets = printOctets;
//# sourceMappingURL=printOctets.js.map