"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvroEncoder = void 0;
class AvroEncoder {
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
                        return this.writeUnknown(value);
                }
            }
            case 'bigint':
                return this.writeLong(value);
            case 'undefined':
                return this.writeNull();
            default:
                return this.writeUnknown(value);
        }
    }
    writeNull() {
    }
    writeBoolean(bool) {
        this.writer.u8(bool ? 1 : 0);
    }
    writeInt(int) {
        this.writeVarIntSigned(this.encodeZigZag32(Math.trunc(int)));
    }
    writeLong(long) {
        if (typeof long === 'bigint') {
            this.writeVarLong(this.encodeZigZag64(long));
        }
        else {
            this.writeVarLong(this.encodeZigZag64(BigInt(Math.trunc(long))));
        }
    }
    writeFloatAvro(float) {
        const writer = this.writer;
        writer.ensureCapacity(4);
        writer.view.setFloat32(writer.x, float, true);
        writer.move(4);
    }
    writeDouble(double) {
        const writer = this.writer;
        writer.ensureCapacity(8);
        writer.view.setFloat64(writer.x, double, true);
        writer.move(8);
    }
    writeBin(bytes) {
        this.writeVarIntUnsigned(bytes.length);
        this.writer.buf(bytes, bytes.length);
    }
    writeStr(str) {
        const writer = this.writer;
        const maxSize = str.length * 4;
        writer.ensureCapacity(5 + maxSize);
        const lengthOffset = writer.x;
        writer.x += 5;
        const bytesWritten = writer.utf8(str);
        const endPos = writer.x;
        writer.x = lengthOffset;
        this.writeVarIntUnsigned(bytesWritten);
        const actualLengthSize = writer.x - lengthOffset;
        if (actualLengthSize < 5) {
            const stringStart = lengthOffset + 5;
            const stringData = writer.uint8.slice(stringStart, endPos);
            writer.x = lengthOffset + actualLengthSize;
            writer.buf(stringData, stringData.length);
        }
        else {
            writer.x = endPos;
        }
    }
    writeArr(arr) {
        this.writeVarIntUnsigned(arr.length);
        const length = arr.length;
        for (let i = 0; i < length; i++) {
            this.writeAny(arr[i]);
        }
        this.writeVarIntUnsigned(0);
    }
    writeObj(obj) {
        const entries = Object.entries(obj);
        const length = entries.length;
        this.writeVarIntUnsigned(length);
        for (let i = 0; i < length; i++) {
            const entry = entries[i];
            this.writeStr(entry[0]);
            this.writeAny(entry[1]);
        }
        this.writeVarIntUnsigned(0);
    }
    writeNumber(num) {
        if (Number.isInteger(num)) {
            if (num >= -2147483648 && num <= 2147483647) {
                this.writeInt(num);
            }
            else {
                this.writeLong(num);
            }
        }
        else {
            this.writeDouble(num);
        }
    }
    writeInteger(int) {
        this.writeInt(int);
    }
    writeUInteger(uint) {
        this.writeInt(uint);
    }
    writeFloat(float) {
        this.writeFloatValue(float);
    }
    writeFloatValue(float) {
        const writer = this.writer;
        writer.ensureCapacity(4);
        writer.view.setFloat32(writer.x, float, true);
        writer.move(4);
    }
    writeAsciiStr(str) {
        const writer = this.writer;
        this.writeVarIntUnsigned(str.length);
        writer.ascii(str);
    }
    writeVarIntSigned(value) {
        const writer = this.writer;
        let n = value >>> 0;
        while (n >= 0x80) {
            writer.u8((n & 0x7f) | 0x80);
            n >>>= 7;
        }
        writer.u8(n & 0x7f);
    }
    writeVarIntUnsigned(value) {
        const writer = this.writer;
        let n = value >>> 0;
        while (n >= 0x80) {
            writer.u8((n & 0x7f) | 0x80);
            n >>>= 7;
        }
        writer.u8(n & 0x7f);
    }
    writeVarLong(value) {
        const writer = this.writer;
        let n = value;
        const mask = BigInt(0x7f);
        const shift = BigInt(7);
        while (n >= BigInt(0x80)) {
            writer.u8(Number((n & mask) | BigInt(0x80)));
            n >>= shift;
        }
        writer.u8(Number(n & mask));
    }
    encodeZigZag32(value) {
        return (value << 1) ^ (value >> 31);
    }
    encodeZigZag64(value) {
        return (value << BigInt(1)) ^ (value >> BigInt(63));
    }
}
exports.AvroEncoder = AvroEncoder;
//# sourceMappingURL=AvroEncoder.js.map