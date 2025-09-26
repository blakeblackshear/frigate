"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RespEncoderLegacy = void 0;
const extensions_1 = require("./extensions");
const JsonPackExtension_1 = require("../JsonPackExtension");
const RespEncoder_1 = require("./RespEncoder");
const REG_RN = /[\r\n]/;
const isSafeInteger = Number.isSafeInteger;
class RespEncoderLegacy extends RespEncoder_1.RespEncoder {
    writeAny(value) {
        switch (typeof value) {
            case 'number':
                return this.writeNumber(value);
            case 'string':
                return this.writeStr(value);
            case 'boolean':
                return this.writeSimpleStr(value ? 'TRUE' : 'FALSE');
            case 'object': {
                if (!value)
                    return this.writeNull();
                if (value instanceof Array)
                    return this.writeArr(value);
                if (value instanceof Uint8Array)
                    return this.writeBin(value);
                if (value instanceof Error)
                    return this.writeErr(value.message);
                if (value instanceof Set)
                    return this.writeSet(value);
                if (value instanceof JsonPackExtension_1.JsonPackExtension) {
                    if (value instanceof extensions_1.RespPush)
                        return this.writeArr(value.val);
                    if (value instanceof extensions_1.RespVerbatimString)
                        return this.writeStr(value.val);
                    if (value instanceof extensions_1.RespAttributes)
                        return this.writeObj(value.val);
                }
                return this.writeObj(value);
            }
            case 'undefined':
                return this.writeUndef();
            case 'bigint':
                return this.writeSimpleStrAscii(value + '');
            default:
                return this.writeUnknown(value);
        }
    }
    writeNumber(num) {
        if (isSafeInteger(num))
            this.writeInteger(num);
        else
            this.writeSimpleStrAscii(num + '');
    }
    writeStr(str) {
        const length = str.length;
        if (length < 64 && !REG_RN.test(str))
            this.writeSimpleStr(str);
        else
            this.writeBulkStr(str);
    }
    writeNull() {
        this.writeNullArr();
    }
    writeErr(str) {
        if (str.length < 64 && !REG_RN.test(str))
            this.writeSimpleErr(str);
        else
            this.writeBulkStr(str);
    }
    writeSet(set) {
        this.writeArr([...set]);
    }
    writeArr(arr) {
        const writer = this.writer;
        const length = arr.length;
        writer.u8(42);
        this.writeLength(length);
        writer.u16(3338);
        for (let i = 0; i < length; i++) {
            const val = arr[i];
            if (val === null)
                this.writeNullStr();
            else
                this.writeAny(val);
        }
    }
    writeObj(obj) {
        const writer = this.writer;
        const keys = Object.keys(obj);
        const length = keys.length;
        writer.u8(42);
        this.writeLength(length << 1);
        writer.u16(3338);
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            this.writeStr(key);
            const val = obj[key];
            if (val === null)
                this.writeNullStr();
            else
                this.writeAny(val);
        }
    }
}
exports.RespEncoderLegacy = RespEncoderLegacy;
//# sourceMappingURL=RespEncoderLegacy.js.map