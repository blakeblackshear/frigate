"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BsonDecoder = void 0;
const Reader_1 = require("@jsonjoy.com/buffers/lib/Reader");
const values_1 = require("./values");
class BsonDecoder {
    constructor(reader = new Reader_1.Reader()) {
        this.reader = reader;
    }
    read(uint8) {
        this.reader.reset(uint8);
        return this.readDocument();
    }
    decode(uint8) {
        this.reader.reset(uint8);
        return this.readDocument();
    }
    readAny() {
        return this.readDocument();
    }
    readDocument() {
        const reader = this.reader;
        const documentSize = reader.view.getInt32(reader.x, true);
        reader.x += 4;
        const startPos = reader.x;
        const endPos = startPos + documentSize - 4 - 1;
        const obj = {};
        while (reader.x < endPos) {
            const elementType = reader.u8();
            if (elementType === 0)
                break;
            const key = this.readCString();
            const value = this.readElementValue(elementType);
            obj[key] = value;
        }
        if (reader.x <= endPos) {
            reader.x = startPos + documentSize - 4;
        }
        return obj;
    }
    readCString() {
        const reader = this.reader;
        const uint8 = reader.uint8;
        const x = reader.x;
        let length = 0;
        while (uint8[x + length] !== 0) {
            length++;
        }
        if (length === 0) {
            reader.x++;
            return '';
        }
        const str = reader.utf8(length);
        reader.x++;
        return str;
    }
    readString() {
        const reader = this.reader;
        const length = reader.view.getInt32(reader.x, true);
        reader.x += 4;
        if (length <= 0) {
            throw new Error('Invalid string length');
        }
        const str = reader.utf8(length - 1);
        reader.x++;
        return str;
    }
    readElementValue(type) {
        const reader = this.reader;
        switch (type) {
            case 0x01:
                const doubleVal = reader.view.getFloat64(reader.x, true);
                reader.x += 8;
                return doubleVal;
            case 0x02:
                return this.readString();
            case 0x03:
                return this.readDocument();
            case 0x04:
                return this.readArray();
            case 0x05:
                return this.readBinary();
            case 0x06:
                return undefined;
            case 0x07:
                return this.readObjectId();
            case 0x08:
                return reader.u8() === 1;
            case 0x09:
                const dateVal = reader.view.getBigInt64(reader.x, true);
                reader.x += 8;
                return new Date(Number(dateVal));
            case 0x0a:
                return null;
            case 0x0b:
                return this.readRegex();
            case 0x0c:
                return this.readDbPointer();
            case 0x0d:
                return new values_1.BsonJavascriptCode(this.readString());
            case 0x0e:
                return Symbol(this.readString());
            case 0x0f:
                return this.readCodeWithScope();
            case 0x10:
                const int32Val = reader.view.getInt32(reader.x, true);
                reader.x += 4;
                return int32Val;
            case 0x11:
                return this.readTimestamp();
            case 0x12:
                const int64Val = reader.view.getBigInt64(reader.x, true);
                reader.x += 8;
                return Number(int64Val);
            case 0x13:
                return this.readDecimal128();
            case 0xff:
                return new values_1.BsonMinKey();
            case 0x7f:
                return new values_1.BsonMaxKey();
            default:
                throw new Error(`Unsupported BSON type: 0x${type.toString(16)}`);
        }
    }
    readArray() {
        const doc = this.readDocument();
        const keys = Object.keys(doc).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
        return keys.map((key) => doc[key]);
    }
    readBinary() {
        const reader = this.reader;
        const length = reader.view.getInt32(reader.x, true);
        reader.x += 4;
        const subtype = reader.u8();
        const data = reader.buf(length);
        if (subtype === 0) {
            return data;
        }
        return new values_1.BsonBinary(subtype, data);
    }
    readObjectId() {
        const reader = this.reader;
        const uint8 = reader.uint8;
        const x = reader.x;
        const timestamp = (uint8[x] << 24) | (uint8[x + 1] << 16) | (uint8[x + 2] << 8) | uint8[x + 3];
        const processLo = uint8[x + 4] | (uint8[x + 5] << 8) | (uint8[x + 6] << 16) | (uint8[x + 7] << 24);
        const processHi = uint8[x + 8];
        const processLoUnsigned = processLo >>> 0;
        const process = processLoUnsigned + processHi * 0x100000000;
        const counter = (uint8[x + 9] << 16) | (uint8[x + 10] << 8) | uint8[x + 11];
        reader.x += 12;
        return new values_1.BsonObjectId(timestamp, process, counter);
    }
    readRegex() {
        const pattern = this.readCString();
        const flags = this.readCString();
        return new RegExp(pattern, flags);
    }
    readDbPointer() {
        const name = this.readString();
        const id = this.readObjectId();
        return new values_1.BsonDbPointer(name, id);
    }
    readCodeWithScope() {
        const reader = this.reader;
        const totalLength = reader.view.getInt32(reader.x, true);
        reader.x += 4;
        const code = this.readString();
        const scope = this.readDocument();
        return new values_1.BsonJavascriptCodeWithScope(code, scope);
    }
    readTimestamp() {
        const reader = this.reader;
        const increment = reader.view.getInt32(reader.x, true);
        reader.x += 4;
        const timestamp = reader.view.getInt32(reader.x, true);
        reader.x += 4;
        return new values_1.BsonTimestamp(increment, timestamp);
    }
    readDecimal128() {
        const reader = this.reader;
        const data = reader.buf(16);
        return new values_1.BsonDecimal128(data);
    }
}
exports.BsonDecoder = BsonDecoder;
//# sourceMappingURL=BsonDecoder.js.map