"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPunctuation = exports.isWhitespace = exports.isLetter = void 0;
const LETTER_REGEX = /(\p{Letter}|\d)/u;
const WHITESPACE_REGEX = /\s/;
const isLetter = (char) => LETTER_REGEX.test(char[0]);
exports.isLetter = isLetter;
const isWhitespace = (char) => WHITESPACE_REGEX.test(char[0]);
exports.isWhitespace = isWhitespace;
const isPunctuation = (char) => !(0, exports.isLetter)(char) && !(0, exports.isWhitespace)(char);
exports.isPunctuation = isPunctuation;
//# sourceMappingURL=util.js.map