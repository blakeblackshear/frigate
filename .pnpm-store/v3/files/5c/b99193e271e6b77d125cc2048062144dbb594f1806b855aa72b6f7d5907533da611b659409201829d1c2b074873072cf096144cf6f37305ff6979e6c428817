"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = exports.encode = exports.decoder = exports.encoder = void 0;
const CborEncoder_1 = require("./CborEncoder");
const CborDecoder_1 = require("./CborDecoder");
exports.encoder = new CborEncoder_1.CborEncoder();
exports.decoder = new CborDecoder_1.CborDecoder();
const encode = (data) => exports.encoder.encode(data);
exports.encode = encode;
const decode = (blob) => exports.decoder.read(blob);
exports.decode = decode;
//# sourceMappingURL=shared.js.map