"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CborEncoder = void 0;
const isFloat32_1 = require("@jsonjoy.com/buffers/lib/isFloat32");
const JsonPackExtension_1 = require("../JsonPackExtension");
const CborEncoderFast_1 = require("./CborEncoderFast");
const JsonPackValue_1 = require("../JsonPackValue");
class CborEncoder extends CborEncoderFast_1.CborEncoderFast {
    writeUnknown(value) {
        this.writeNull();
    }
    writeAny(value) {
        switch (typeof value) {
            case 'number':
                return this.writeNumber(value);
            case 'string':
                return this.writeStr(value);
            case 'boolean':
                return this.writer.u8(0xf4 + +value);
            case 'object': {
                if (!value)
                    return this.writer.u8(0xf6);
                const constructor = value.constructor;
                switch (constructor) {
                    case Object:
                        return this.writeObj(value);
                    case Array:
                        return this.writeArr(value);
                    case Uint8Array:
                        return this.writeBin(value);
                    case Map:
                        return this.writeMap(value);
                    case JsonPackExtension_1.JsonPackExtension:
                        return this.writeTag(value.tag, value.val);
                    case JsonPackValue_1.JsonPackValue:
                        const buf = value.val;
                        return this.writer.buf(buf, buf.length);
                    default:
                        if (value instanceof Uint8Array)
                            return this.writeBin(value);
                        if (Array.isArray(value))
                            return this.writeArr(value);
                        if (value instanceof Map)
                            return this.writeMap(value);
                        return this.writeUnknown(value);
                }
            }
            case 'undefined':
                return this.writeUndef();
            case 'bigint':
                return this.writeBigInt(value);
            default:
                return this.writeUnknown(value);
        }
    }
    writeFloat(float) {
        if ((0, isFloat32_1.isFloat32)(float))
            this.writer.u8f32(0xfa, float);
        else
            this.writer.u8f64(0xfb, float);
    }
    writeMap(map) {
        this.writeMapHdr(map.size);
        map.forEach((value, key) => {
            this.writeAny(key);
            this.writeAny(value);
        });
    }
    writeUndef() {
        this.writer.u8(0xf7);
    }
}
exports.CborEncoder = CborEncoder;
//# sourceMappingURL=CborEncoder.js.map