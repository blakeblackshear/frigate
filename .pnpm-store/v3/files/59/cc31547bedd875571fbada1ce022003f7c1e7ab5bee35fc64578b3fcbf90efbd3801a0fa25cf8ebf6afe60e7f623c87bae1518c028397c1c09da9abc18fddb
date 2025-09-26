"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBase64 = void 0;
const constants_1 = require("./constants");
const createToBase64_1 = require("./createToBase64");
const encodeSmall = (0, createToBase64_1.createToBase64)();
exports.toBase64 = !constants_1.hasBuffer
    ? (uint8) => encodeSmall(uint8, uint8.length)
    : (uint8) => {
        const length = uint8.length;
        if (length <= 48)
            return encodeSmall(uint8, length);
        return Buffer.from(uint8).toString('base64');
    };
//# sourceMappingURL=toBase64.js.map