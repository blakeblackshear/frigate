"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filenameToSteps = exports.resolve = exports.unixify = exports.isWin = void 0;
exports.isFd = isFd;
exports.validateFd = validateFd;
exports.dataToBuffer = dataToBuffer;
const path_1 = require("../vendor/node/path");
const buffer_1 = require("../vendor/node/internal/buffer");
const process_1 = require("../process");
const encoding_1 = require("../encoding");
const constants_1 = require("../node/constants");
exports.isWin = process_1.default.platform === 'win32';
const resolveCrossPlatform = path_1.resolve;
const pathSep = path_1.posix ? path_1.posix.sep : path_1.sep;
const isSeparator = (str, i) => {
    let char = str[i];
    return i > 0 && (char === '/' || (exports.isWin && char === '\\'));
};
const removeTrailingSeparator = (str) => {
    let i = str.length - 1;
    if (i < 2)
        return str;
    while (isSeparator(str, i))
        i--;
    return str.substr(0, i + 1);
};
const normalizePath = (str, stripTrailing) => {
    if (typeof str !== 'string')
        throw new TypeError('expected a string');
    str = str.replace(/[\\\/]+/g, '/');
    if (stripTrailing !== false)
        str = removeTrailingSeparator(str);
    return str;
};
const unixify = (filepath, stripTrailing = true) => {
    if (exports.isWin) {
        filepath = normalizePath(filepath, stripTrailing);
        return filepath.replace(/^([a-zA-Z]+:|\.\/)/, '');
    }
    return filepath;
};
exports.unixify = unixify;
let resolve = (filename, base = process_1.default.cwd()) => resolveCrossPlatform(base, filename);
exports.resolve = resolve;
if (exports.isWin) {
    const _resolve = resolve;
    exports.resolve = resolve = (filename, base) => (0, exports.unixify)(_resolve(filename, base));
}
const filenameToSteps = (filename, base) => {
    const fullPath = resolve(filename, base);
    const fullPathSansSlash = fullPath.substring(1);
    if (!fullPathSansSlash)
        return [];
    return fullPathSansSlash.split(pathSep);
};
exports.filenameToSteps = filenameToSteps;
function isFd(path) {
    return path >>> 0 === path;
}
function validateFd(fd) {
    if (!isFd(fd))
        throw TypeError(constants_1.ERRSTR.FD);
}
function dataToBuffer(data, encoding = encoding_1.ENCODING_UTF8) {
    if (buffer_1.Buffer.isBuffer(data))
        return data;
    else if (data instanceof Uint8Array)
        return (0, buffer_1.bufferFrom)(data);
    else if (encoding === 'buffer')
        return (0, buffer_1.bufferFrom)(String(data), 'utf8');
    else
        return (0, buffer_1.bufferFrom)(String(data), encoding);
}
//# sourceMappingURL=util.js.map