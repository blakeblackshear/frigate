"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromBase64 = void 0;
const bufferToUint8Array_1 = require("./util/buffers/bufferToUint8Array");
const constants_1 = require("./constants");
const createFromBase64_1 = require("./createFromBase64");
const fromBase64Cpp = constants_1.hasBuffer ? (encoded) => (0, bufferToUint8Array_1.bufferToUint8Array)(Buffer.from(encoded, 'base64')) : null;
const fromBase64Native = (0, createFromBase64_1.createFromBase64)();
exports.fromBase64 = !fromBase64Cpp
    ? fromBase64Native
    : (encoded) => (encoded.length > 48 ? fromBase64Cpp(encoded) : fromBase64Native(encoded));
//# sourceMappingURL=fromBase64.js.map