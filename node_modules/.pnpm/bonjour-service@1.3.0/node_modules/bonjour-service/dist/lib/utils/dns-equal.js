"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = dnsEqual;
const capitalLetterRegex = /[A-Z]/g;
function toLowerCase(input) {
    return input.toLowerCase();
}
function dnsEqual(a, b) {
    const aFormatted = a.replace(capitalLetterRegex, toLowerCase);
    const bFormatted = b.replace(capitalLetterRegex, toLowerCase);
    return aFormatted === bFormatted;
}
//# sourceMappingURL=dns-equal.js.map