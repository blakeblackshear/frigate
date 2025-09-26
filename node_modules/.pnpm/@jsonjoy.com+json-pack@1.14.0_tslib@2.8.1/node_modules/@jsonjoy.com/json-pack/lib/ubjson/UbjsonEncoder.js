"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UbjsonEncoder = void 0;
class UbjsonEncoder {
    constructor(writer) {
        this.writer = writer;
    }
    encode(value) {
        const writer = this.writer;
        writer.reset();
        this.writeAny(value);
        return writer.flush();
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
                    case Array:
                        return this.writeArr(value);
                    case Uint8Array:
                        return this.writeBin(value);
                    default:
                        return this.writeObj(value);
                }
            }
            case 'bigint':
                return this.writeBigInt(value);
            case 'undefined':
                return this.writeUndef();
            default:
                return this.writeNull();
        }
    }
    writeNull() {
        this.writer.u8(0x5a);
    }
    writeUndef() {
        this.writer.u8(0x4e);
    }
    writeBoolean(bool) {
        this.writer.u8(bool ? 0x54 : 0x46);
    }
    writeNumber(num) {
        if (num >> 0 === num)
            return this.writeInteger(num);
        this.writeFloat(num);
    }
    writeInteger(int) {
        const writer = this.writer;
        if (int <= 0xff && 0 <= int)
            writer.u16(0x5500 | int);
        else if (int <= 127 && -128 <= int) {
            writer.u16(0x6900);
            writer.view.setInt8(writer.x - 1, int);
        }
        else if (int <= 32767 && -32768 <= int) {
            writer.ensureCapacity(3);
            writer.u8(0x49);
            writer.view.setInt16(writer.x, int, false);
            writer.x += 2;
        }
        else if (int <= 2147483647 && -2147483648 <= int) {
            writer.ensureCapacity(5);
            writer.u8(0x6c);
            writer.view.setInt32(writer.x, int, false);
            writer.x += 4;
        }
    }
    writeUInteger(uint) {
        const writer = this.writer;
        if (uint < 0xff)
            writer.u16(0x5500 + uint);
    }
    writeFloat(float) {
        const writer = this.writer;
        writer.ensureCapacity(9);
        const view = writer.view;
        const x = writer.x;
        view.setUint8(x, 0x44);
        view.setFloat64(x + 1, float, false);
        writer.x = x + 9;
    }
    writeBigInt(int) {
        const writer = this.writer;
        writer.ensureCapacity(9);
        const view = writer.view;
        const x = writer.x;
        view.setUint8(x, 0x4c);
        view.setBigInt64(x + 1, int, false);
        writer.x = x + 9;
    }
    writeBin(buf) {
        const writer = this.writer;
        const length = buf.length;
        writer.u32(1529107747);
        this.writeInteger(length);
        writer.buf(buf, length);
    }
    writeStr(str) {
        const length = str.length;
        const maxLength = length * 4;
        const capacity = maxLength + 1 + 5;
        const writer = this.writer;
        writer.ensureCapacity(capacity);
        const uint8 = writer.uint8;
        uint8[writer.x++] = 0x53;
        const x = writer.x;
        const oneByteLength = maxLength < 0xff;
        if (oneByteLength) {
            uint8[writer.x++] = 0x55;
            writer.x++;
        }
        else {
            uint8[writer.x++] = 0x6c;
            writer.x += 4;
        }
        const size = writer.utf8(str);
        if (oneByteLength)
            uint8[x + 1] = size;
        else
            writer.view.setUint32(x + 1, size);
    }
    writeAsciiStr(str) {
        this.writeStr(str);
    }
    writeArr(arr) {
        const writer = this.writer;
        writer.u8(0x5b);
        const length = arr.length;
        for (let i = 0; i < length; i++)
            this.writeAny(arr[i]);
        writer.u8(0x5d);
    }
    writeObj(obj) {
        const writer = this.writer;
        const keys = Object.keys(obj);
        const length = keys.length;
        writer.u8(0x7b);
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            const value = obj[key];
            this.writeKey(key);
            this.writeAny(value);
        }
        writer.u8(0x7d);
    }
    writeKey(str) {
        const length = str.length;
        const maxLength = length * 4;
        const capacity = maxLength + 5;
        const writer = this.writer;
        writer.ensureCapacity(capacity);
        const uint8 = writer.uint8;
        const x = writer.x;
        const oneByteLength = maxLength < 0xff;
        if (oneByteLength) {
            uint8[writer.x++] = 0x55;
            writer.x++;
        }
        else {
            uint8[writer.x++] = 0x6c;
            writer.x += 4;
        }
        const size = writer.utf8(str);
        if (oneByteLength)
            uint8[x + 1] = size;
        else
            writer.view.setUint32(x + 1, size);
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
        this.writeAny(item);
    }
    writeEndArr() {
        this.writer.u8(0x5d);
    }
    writeStartObj() {
        this.writer.u8(0x7b);
    }
    writeObjChunk(key, value) {
        this.writeKey(key);
        this.writeAny(value);
    }
    writeEndObj() {
        this.writer.u8(0x7d);
    }
}
exports.UbjsonEncoder = UbjsonEncoder;
//# sourceMappingURL=UbjsonEncoder.js.map