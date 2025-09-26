"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvroDecoder = void 0;
const Reader_1 = require("@jsonjoy.com/buffers/lib/Reader");
class AvroDecoder {
    constructor() {
        this.reader = new Reader_1.Reader();
    }
    read(uint8) {
        this.reader.reset(uint8);
        return this.readAny();
    }
    decode(uint8) {
        this.reader.reset(uint8);
        return this.readAny();
    }
    readAny() {
        throw new Error('readAny() requires schema information. Use readNull, readBoolean, etc. directly.');
    }
    readNull() {
        return null;
    }
    readBoolean() {
        return this.reader.u8() === 1;
    }
    readInt() {
        const zigzag = this.readVarIntUnsigned();
        return this.decodeZigZag32(zigzag);
    }
    readLong() {
        const zigzag = this.readVarLong();
        const decoded = this.decodeZigZag64(zigzag);
        if (decoded >= BigInt(Number.MIN_SAFE_INTEGER) && decoded <= BigInt(Number.MAX_SAFE_INTEGER)) {
            return Number(decoded);
        }
        return decoded;
    }
    readFloat() {
        const reader = this.reader;
        const value = reader.view.getFloat32(reader.x, true);
        reader.x += 4;
        return value;
    }
    readDouble() {
        const reader = this.reader;
        const value = reader.view.getFloat64(reader.x, true);
        reader.x += 8;
        return value;
    }
    readBytes() {
        const length = this.readVarIntUnsigned();
        return this.reader.buf(length);
    }
    readString() {
        const length = this.readVarIntUnsigned();
        const bytes = this.reader.buf(length);
        return new TextDecoder().decode(bytes);
    }
    readArray(itemReader) {
        const result = [];
        while (true) {
            const count = this.readVarIntUnsigned();
            if (count === 0)
                break;
            for (let i = 0; i < count; i++) {
                result.push(itemReader());
            }
        }
        return result;
    }
    readMap(valueReader) {
        const result = {};
        while (true) {
            const count = this.readVarIntUnsigned();
            if (count === 0)
                break;
            for (let i = 0; i < count; i++) {
                const key = this.readString();
                if (key === '__proto__')
                    throw new Error('INVALID_KEY');
                result[key] = valueReader();
            }
        }
        return result;
    }
    readUnion(schemaReaders) {
        const index = this.decodeZigZag32(this.readVarIntUnsigned());
        if (index < 0 || index >= schemaReaders.length) {
            throw new Error(`Invalid union index: ${index}`);
        }
        const value = schemaReaders[index]();
        return { index, value };
    }
    readEnum() {
        return this.decodeZigZag32(this.readVarIntUnsigned());
    }
    readFixed(size) {
        return this.reader.buf(size);
    }
    readRecord(fieldReaders) {
        const result = {};
        for (let i = 0; i < fieldReaders.length; i++) {
            const fieldValue = fieldReaders[i]();
            result[`field${i}`] = fieldValue;
        }
        return result;
    }
    readVarIntUnsigned() {
        const reader = this.reader;
        let result = 0;
        let shift = 0;
        while (true) {
            const byte = reader.u8();
            result |= (byte & 0x7f) << shift;
            if ((byte & 0x80) === 0)
                break;
            shift += 7;
            if (shift >= 32) {
                throw new Error('Variable-length integer is too long');
            }
        }
        return result >>> 0;
    }
    readVarLong() {
        const reader = this.reader;
        let result = BigInt(0);
        let shift = BigInt(0);
        while (true) {
            const byte = BigInt(reader.u8());
            result |= (byte & BigInt(0x7f)) << shift;
            if ((byte & BigInt(0x80)) === BigInt(0))
                break;
            shift += BigInt(7);
            if (shift >= BigInt(64)) {
                throw new Error('Variable-length long is too long');
            }
        }
        return result;
    }
    decodeZigZag32(value) {
        return (value >>> 1) ^ -(value & 1);
    }
    decodeZigZag64(value) {
        return (value >> BigInt(1)) ^ -(value & BigInt(1));
    }
}
exports.AvroDecoder = AvroDecoder;
//# sourceMappingURL=AvroDecoder.js.map