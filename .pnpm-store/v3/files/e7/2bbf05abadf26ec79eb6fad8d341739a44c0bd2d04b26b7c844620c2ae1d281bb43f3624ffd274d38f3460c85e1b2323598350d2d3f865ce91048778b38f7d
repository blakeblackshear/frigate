"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BencodeEncoder = void 0;
const utf8_1 = require("@jsonjoy.com/util/lib/strings/utf8");
const insertion_1 = require("@jsonjoy.com/util/lib/sort/insertion");
class BencodeEncoder {
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
                    case Map:
                        return this.writeMap(value);
                    case Set:
                        return this.writeSet(value);
                    default:
                        return this.writeUnknown(value);
                }
            }
            case 'bigint': {
                return this.writeBigint(value);
            }
            case 'undefined': {
                return this.writeUndef();
            }
            default:
                return this.writeUnknown(value);
        }
    }
    writeNull() {
        this.writer.u8(110);
    }
    writeUndef() {
        this.writer.u8(117);
    }
    writeBoolean(bool) {
        this.writer.u8(bool ? 0x74 : 0x66);
    }
    writeNumber(num) {
        const writer = this.writer;
        writer.u8(0x69);
        writer.ascii(Math.round(num) + '');
        writer.u8(0x65);
    }
    writeInteger(int) {
        const writer = this.writer;
        writer.u8(0x69);
        writer.ascii(int + '');
        writer.u8(0x65);
    }
    writeUInteger(uint) {
        this.writeInteger(uint);
    }
    writeFloat(float) {
        this.writeNumber(float);
    }
    writeBigint(int) {
        const writer = this.writer;
        writer.u8(0x69);
        writer.ascii(int + '');
        writer.u8(0x65);
    }
    writeBin(buf) {
        const writer = this.writer;
        const length = buf.length;
        writer.ascii(length + '');
        writer.u8(0x3a);
        writer.buf(buf, length);
    }
    writeStr(str) {
        const writer = this.writer;
        const length = (0, utf8_1.utf8Size)(str);
        writer.ascii(length + '');
        writer.u8(0x3a);
        writer.ensureCapacity(str.length * 4);
        writer.utf8(str);
    }
    writeAsciiStr(str) {
        const writer = this.writer;
        writer.ascii(str.length + '');
        writer.u8(0x3a);
        writer.ascii(str);
    }
    writeArr(arr) {
        const writer = this.writer;
        writer.u8(0x6c);
        const length = arr.length;
        for (let i = 0; i < length; i++)
            this.writeAny(arr[i]);
        writer.u8(0x65);
    }
    writeObj(obj) {
        const writer = this.writer;
        writer.u8(0x64);
        const keys = (0, insertion_1.sort)(Object.keys(obj));
        const length = keys.length;
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            this.writeStr(key);
            this.writeAny(obj[key]);
        }
        writer.u8(0x65);
    }
    writeMap(obj) {
        const writer = this.writer;
        writer.u8(0x64);
        const keys = (0, insertion_1.sort)([...obj.keys()]);
        const length = keys.length;
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            this.writeStr(key + '');
            this.writeAny(obj.get(key));
        }
        writer.u8(0x65);
    }
    writeSet(set) {
        this.writeArr([...set.values()]);
    }
}
exports.BencodeEncoder = BencodeEncoder;
//# sourceMappingURL=BencodeEncoder.js.map