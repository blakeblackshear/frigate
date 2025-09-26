"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENCODING_UTF8 = void 0;
exports.assertEncoding = assertEncoding;
exports.strToEncoding = strToEncoding;
const buffer_1 = require("./vendor/node/internal/buffer");
const errors = require("./vendor/node/internal/errors");
exports.ENCODING_UTF8 = 'utf8';
function assertEncoding(encoding) {
    if (encoding && !buffer_1.Buffer.isEncoding(encoding))
        throw new errors.TypeError('ERR_INVALID_OPT_VALUE_ENCODING', encoding);
}
function strToEncoding(str, encoding) {
    if (!encoding || encoding === exports.ENCODING_UTF8)
        return str; // UTF-8
    if (encoding === 'buffer')
        return new buffer_1.Buffer(str); // `buffer` encoding
    return new buffer_1.Buffer(str).toString(encoding); // Custom encoding
}
//# sourceMappingURL=encoding.js.map