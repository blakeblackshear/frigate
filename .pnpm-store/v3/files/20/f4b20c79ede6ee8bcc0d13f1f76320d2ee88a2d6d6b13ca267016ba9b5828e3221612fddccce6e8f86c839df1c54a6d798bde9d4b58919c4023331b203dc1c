"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringify = exports.wrapBinary = exports.stringifyBinary = exports.parse = exports.unwrapBinary = void 0;
const JsonPackExtension_1 = require("../JsonPackExtension");
const JsonPackValue_1 = require("../JsonPackValue");
const fromBase64_1 = require("@jsonjoy.com/base64/lib/fromBase64");
const toBase64_1 = require("@jsonjoy.com/base64/lib/toBase64");
const isUint8Array_1 = require("@jsonjoy.com/buffers/lib/isUint8Array");
const constants_1 = require("./constants");
const binUriStartLength = constants_1.binUriStart.length;
const msgPackUriStartLength = constants_1.msgPackUriStart.length;
const msgPackExtStartLength = constants_1.msgPackExtStart.length;
const minDataUri = Math.min(binUriStartLength, msgPackUriStartLength);
const parseExtDataUri = (uri) => {
    uri = uri.substring(msgPackExtStartLength);
    const commaIndex = uri.indexOf(',');
    if (commaIndex === -1)
        throw new Error('INVALID_EXT_DATA_URI');
    const typeString = uri.substring(0, commaIndex);
    const buf = (0, fromBase64_1.fromBase64)(uri.substring(commaIndex + 1));
    return new JsonPackExtension_1.JsonPackExtension(Number(typeString), buf);
};
const unwrapBinary = (value) => {
    if (!value)
        return value;
    if (value instanceof Array) {
        const len = value.length;
        for (let i = 0; i < len; i++) {
            const item = value[i];
            switch (typeof item) {
                case 'object': {
                    (0, exports.unwrapBinary)(item);
                    continue;
                }
                case 'string': {
                    if (item.length < minDataUri)
                        continue;
                    if (item.substring(0, binUriStartLength) === constants_1.binUriStart)
                        value[i] = (0, fromBase64_1.fromBase64)(item.substring(binUriStartLength));
                    else if (item.substring(0, msgPackUriStartLength) === constants_1.msgPackUriStart)
                        value[i] = new JsonPackValue_1.JsonPackValue((0, fromBase64_1.fromBase64)(item.substring(msgPackUriStartLength)));
                    else if (item.substring(0, msgPackExtStartLength) === constants_1.msgPackExtStart)
                        value[i] = parseExtDataUri(item);
                }
            }
        }
        return value;
    }
    if (typeof value === 'object') {
        for (const key in value) {
            const item = value[key];
            switch (typeof item) {
                case 'object': {
                    (0, exports.unwrapBinary)(item);
                    continue;
                }
                case 'string': {
                    if (item.length < minDataUri)
                        continue;
                    if (item.substring(0, binUriStartLength) === constants_1.binUriStart) {
                        const buf = (0, fromBase64_1.fromBase64)(item.substring(binUriStartLength));
                        value[key] = buf;
                    }
                    else if (item.substring(0, msgPackUriStartLength) === constants_1.msgPackUriStart) {
                        value[key] = new JsonPackValue_1.JsonPackValue((0, fromBase64_1.fromBase64)(item.substring(msgPackUriStartLength)));
                    }
                    else if (item.substring(0, msgPackExtStartLength) === constants_1.msgPackExtStart)
                        value[key] = parseExtDataUri(item);
                }
            }
        }
        return value;
    }
    if (typeof value === 'string') {
        if (value.length < minDataUri)
            return value;
        if (value.substring(0, binUriStartLength) === constants_1.binUriStart)
            return (0, fromBase64_1.fromBase64)(value.substring(binUriStartLength));
        if (value.substring(0, msgPackUriStartLength) === constants_1.msgPackUriStart)
            return new JsonPackValue_1.JsonPackValue((0, fromBase64_1.fromBase64)(value.substring(msgPackUriStartLength)));
        if (value.substring(0, msgPackExtStartLength) === constants_1.msgPackExtStart)
            return parseExtDataUri(value);
        else
            return value;
    }
    return value;
};
exports.unwrapBinary = unwrapBinary;
const parse = (json) => {
    const parsed = JSON.parse(json);
    return (0, exports.unwrapBinary)(parsed);
};
exports.parse = parse;
const stringifyBinary = (value) => (constants_1.binUriStart + (0, toBase64_1.toBase64)(value));
exports.stringifyBinary = stringifyBinary;
const wrapBinary = (value) => {
    if (!value)
        return value;
    if ((0, isUint8Array_1.isUint8Array)(value))
        return (0, exports.stringifyBinary)(value);
    if (value instanceof Array) {
        const out = [];
        const len = value.length;
        for (let i = 0; i < len; i++) {
            const item = value[i];
            out.push(!item || typeof item !== 'object' ? item : (0, exports.wrapBinary)(item));
        }
        return out;
    }
    if (value instanceof JsonPackValue_1.JsonPackValue)
        return constants_1.msgPackUriStart + (0, toBase64_1.toBase64)(value.val);
    if (value instanceof JsonPackExtension_1.JsonPackExtension)
        return constants_1.msgPackExtStart + value.tag + ',' + (0, toBase64_1.toBase64)(value.val);
    if (typeof value === 'object') {
        const out = {};
        for (const key in value) {
            const item = value[key];
            out[key] = !item || typeof item !== 'object' ? item : (0, exports.wrapBinary)(item);
        }
        return out;
    }
    return value;
};
exports.wrapBinary = wrapBinary;
const stringify = (value, replacer, space) => {
    const wrapped = (0, exports.wrapBinary)(value);
    return JSON.stringify(wrapped, replacer, space);
};
exports.stringify = stringify;
//# sourceMappingURL=codec.js.map