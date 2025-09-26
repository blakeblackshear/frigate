"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = exports.encodeFull = exports.encode = exports.decoder = exports.encoderFull = exports.encoder = void 0;
const MsgPackEncoderFast_1 = require("./MsgPackEncoderFast");
const MsgPackEncoder_1 = require("./MsgPackEncoder");
const MsgPackDecoderFast_1 = require("./MsgPackDecoderFast");
exports.encoder = new MsgPackEncoderFast_1.MsgPackEncoderFast();
exports.encoderFull = new MsgPackEncoder_1.MsgPackEncoder();
exports.decoder = new MsgPackDecoderFast_1.MsgPackDecoderFast();
const encode = (data) => exports.encoder.encode(data);
exports.encode = encode;
const encodeFull = (data) => exports.encoderFull.encode(data);
exports.encodeFull = encodeFull;
const decode = (blob) => exports.decoder.decode(blob);
exports.decode = decode;
//# sourceMappingURL=util.js.map