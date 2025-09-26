"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgPackEncoder = void 0;
const MsgPackEncoderFast_1 = require("./MsgPackEncoderFast");
const isUint8Array_1 = require("@jsonjoy.com/buffers/lib/isUint8Array");
const JsonPackExtension_1 = require("../JsonPackExtension");
const JsonPackValue_1 = require("../JsonPackValue");
class MsgPackEncoder extends MsgPackEncoderFast_1.MsgPackEncoderFast {
    writeAny(value) {
        switch (value) {
            case null:
                return this.writer.u8(192);
            case false:
                return this.writer.u8(194);
            case true:
                return this.writer.u8(195);
        }
        if (value instanceof Array)
            return this.encodeArray(value);
        switch (typeof value) {
            case 'number':
                return this.encodeNumber(value);
            case 'string':
                return this.encodeString(value);
            case 'object': {
                if (value instanceof JsonPackValue_1.JsonPackValue)
                    return this.writer.buf(value.val, value.val.length);
                if (value instanceof JsonPackExtension_1.JsonPackExtension)
                    return this.encodeExt(value);
                if ((0, isUint8Array_1.isUint8Array)(value))
                    return this.encodeBinary(value);
                return this.encodeObject(value);
            }
            case 'undefined':
                return this.writer.u8(193);
        }
    }
}
exports.MsgPackEncoder = MsgPackEncoder;
//# sourceMappingURL=MsgPackEncoder.js.map