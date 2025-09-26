"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomStr = randomStr;
// Default alphabet allows "-" hyphens, because UUIDs have them.
const defaultAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-';
function randomStr(length, alphabet = defaultAlphabet) {
    let str = '';
    const alphabetLength = alphabet.length;
    for (let i = 0; i < length; i++) {
        str += alphabet.charAt(Math.floor(Math.random() * alphabetLength));
    }
    return str;
}
