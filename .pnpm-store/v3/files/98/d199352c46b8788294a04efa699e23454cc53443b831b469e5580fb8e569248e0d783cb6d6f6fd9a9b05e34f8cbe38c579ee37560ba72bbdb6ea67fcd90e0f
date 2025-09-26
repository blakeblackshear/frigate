"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonEncoder = void 0;
const toBase64Bin_1 = require("@jsonjoy.com/base64/lib/toBase64Bin");
class JsonEncoder {
    constructor(writer) {
        this.writer = writer;
    }
    encode(value) {
        const writer = this.writer;
        writer.reset();
        this.writeAny(value);
        return writer.flush();
    }
    writeUnknown(value) {
        this.writeNull();
    }
    writeAny(value) {
        switch (typeof value) {
            case 'boolean':
                return this.writeBoolean(value);
            case 'number':
                return this.writeNumber(value);
            case 'string':
                return this.writeStr(value);
            case 'object': {
                if (value === null)
                    return this.writeNull();
                const constructor = value.constructor;
                switch (constructor) {
                    case Object:
                        return this.writeObj(value);
                    case Array:
                        return this.writeArr(value);
                    case Uint8Array:
                        return this.writeBin(value);
                    default:
                        if (value instanceof Uint8Array)
                            return this.writeBin(value);
                        if (Array.isArray(value))
                            return this.writeArr(value);
                        return this.writeUnknown(value);
                }
            }
            case 'undefined': {
                return this.writeUndef();
            }
            default:
                return this.writeUnknown(value);
        }
    }
    writeNull() {
        this.writer.u32(0x6e756c6c);
    }
    writeUndef() {
        const writer = this.writer;
        const length = 35;
        writer.ensureCapacity(length);
        const view = writer.view;
        let x = writer.x;
        view.setUint32(x, 577003892);
        x += 4;
        view.setUint32(x, 1631215984);
        x += 4;
        view.setUint32(x, 1886153059);
        x += 4;
        view.setUint32(x, 1635019119);
        x += 4;
        view.setUint32(x, 1848599394);
        x += 4;
        view.setUint32(x, 1869753442);
        x += 4;
        view.setUint32(x, 1634952502);
        x += 4;
        view.setUint32(x, 876296567);
        x += 4;
        view.setUint16(x, 15677);
        x += 2;
        writer.uint8[x++] = 0x22;
        writer.x = x;
    }
    writeBoolean(bool) {
        if (bool)
            this.writer.u32(0x74727565);
        else
            this.writer.u8u32(0x66, 0x616c7365);
    }
    writeNumber(num) {
        const str = num.toString();
        this.writer.ascii(str);
    }
    writeInteger(int) {
        this.writeNumber(int >> 0 === int ? int : Math.trunc(int));
    }
    writeUInteger(uint) {
        this.writeInteger(uint < 0 ? -uint : uint);
    }
    writeFloat(float) {
        this.writeNumber(float);
    }
    writeBin(buf) {
        const writer = this.writer;
        const length = buf.length;
        writer.ensureCapacity(38 + 3 + (length << 1));
        const view = writer.view;
        let x = writer.x;
        view.setUint32(x, 577003892);
        x += 4;
        view.setUint32(x, 1631215984);
        x += 4;
        view.setUint32(x, 1886153059);
        x += 4;
        view.setUint32(x, 1635019119);
        x += 4;
        view.setUint32(x, 1848602467);
        x += 4;
        view.setUint32(x, 1952805933);
        x += 4;
        view.setUint32(x, 1937011301);
        x += 4;
        view.setUint32(x, 1634548578);
        x += 4;
        view.setUint32(x, 1634952502);
        x += 4;
        view.setUint16(x, 13356);
        x += 2;
        x = (0, toBase64Bin_1.toBase64Bin)(buf, 0, length, view, x);
        writer.uint8[x++] = 0x22;
        writer.x = x;
    }
    writeStr(str) {
        const writer = this.writer;
        const length = str.length;
        writer.ensureCapacity(length * 4 + 2);
        if (length < 256) {
            let x = writer.x;
            const uint8 = writer.uint8;
            uint8[x++] = 0x22;
            for (let i = 0; i < length; i++) {
                const code = str.charCodeAt(i);
                switch (code) {
                    case 34:
                    case 92:
                        uint8[x++] = 0x5c;
                        break;
                }
                if (code < 32 || code > 126) {
                    writer.utf8(JSON.stringify(str));
                    return;
                }
                else
                    uint8[x++] = code;
            }
            uint8[x++] = 0x22;
            writer.x = x;
            return;
        }
        writer.utf8(JSON.stringify(str));
    }
    writeAsciiStr(str) {
        const length = str.length;
        const writer = this.writer;
        writer.ensureCapacity(length * 2 + 2);
        const uint8 = writer.uint8;
        let x = writer.x;
        uint8[x++] = 0x22;
        for (let i = 0; i < length; i++) {
            const code = str.charCodeAt(i);
            switch (code) {
                case 34:
                case 92:
                    uint8[x++] = 0x5c;
                    break;
            }
            uint8[x++] = code;
        }
        uint8[x++] = 0x22;
        writer.x = x;
    }
    writeArr(arr) {
        const writer = this.writer;
        writer.u8(0x5b);
        const length = arr.length;
        const last = length - 1;
        for (let i = 0; i < last; i++) {
            this.writeAny(arr[i]);
            writer.u8(0x2c);
        }
        if (last >= 0)
            this.writeAny(arr[last]);
        writer.u8(0x5d);
    }
    writeArrSeparator() {
        this.writer.u8(0x2c);
    }
    writeObj(obj) {
        const writer = this.writer;
        const keys = Object.keys(obj);
        const length = keys.length;
        if (!length)
            return writer.u16(0x7b7d);
        writer.u8(0x7b);
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            const value = obj[key];
            this.writeStr(key);
            writer.u8(0x3a);
            this.writeAny(value);
            writer.u8(0x2c);
        }
        writer.uint8[writer.x - 1] = 0x7d;
    }
    writeObjSeparator() {
        this.writer.u8(0x2c);
    }
    writeObjKeySeparator() {
        this.writer.u8(0x3a);
    }
    writeStartStr() {
        throw new Error('Method not implemented.');
    }
    writeStrChunk(str) {
        throw new Error('Method not implemented.');
    }
    writeEndStr() {
        throw new Error('Method not implemented.');
    }
    writeStartBin() {
        throw new Error('Method not implemented.');
    }
    writeBinChunk(buf) {
        throw new Error('Method not implemented.');
    }
    writeEndBin() {
        throw new Error('Method not implemented.');
    }
    writeStartArr() {
        this.writer.u8(0x5b);
    }
    writeArrChunk(item) {
        throw new Error('Method not implemented.');
    }
    writeEndArr() {
        this.writer.u8(0x5d);
    }
    writeStartObj() {
        this.writer.u8(0x7b);
    }
    writeObjChunk(key, value) {
        throw new Error('Method not implemented.');
    }
    writeEndObj() {
        this.writer.u8(0x7d);
    }
}
exports.JsonEncoder = JsonEncoder;
//# sourceMappingURL=JsonEncoder.js.map