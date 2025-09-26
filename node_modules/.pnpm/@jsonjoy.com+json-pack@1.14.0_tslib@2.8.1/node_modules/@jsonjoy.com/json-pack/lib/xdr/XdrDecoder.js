"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XdrDecoder = void 0;
const Reader_1 = require("@jsonjoy.com/buffers/lib/Reader");
class XdrDecoder {
    constructor(reader = new Reader_1.Reader()) {
        this.reader = reader;
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
        throw new Error('XdrDecoder.readAny() requires explicit type methods or use XdrSchemaDecoder');
    }
    readVoid() {
    }
    readBoolean() {
        return this.readInt() !== 0;
    }
    readInt() {
        const reader = this.reader;
        const value = reader.view.getInt32(reader.x, false);
        reader.x += 4;
        return value;
    }
    readUnsignedInt() {
        const reader = this.reader;
        const value = reader.view.getUint32(reader.x, false);
        reader.x += 4;
        return value;
    }
    readHyper() {
        const reader = this.reader;
        const value = reader.view.getBigInt64(reader.x, false);
        reader.x += 8;
        return value;
    }
    readUnsignedHyper() {
        const reader = this.reader;
        const value = reader.view.getBigUint64(reader.x, false);
        reader.x += 8;
        return value;
    }
    readFloat() {
        const reader = this.reader;
        const value = reader.view.getFloat32(reader.x, false);
        reader.x += 4;
        return value;
    }
    readDouble() {
        const reader = this.reader;
        const value = reader.view.getFloat64(reader.x, false);
        reader.x += 8;
        return value;
    }
    readQuadruple() {
        throw new Error('not implemented');
    }
    readOpaque(size) {
        const reader = this.reader;
        const data = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
            data[i] = reader.u8();
        }
        const paddedSize = Math.ceil(size / 4) * 4;
        const padding = paddedSize - size;
        reader.skip(padding);
        return data;
    }
    readVarlenOpaque() {
        const size = this.readUnsignedInt();
        return this.readOpaque(size);
    }
    readString() {
        const size = this.readUnsignedInt();
        const reader = this.reader;
        const utf8Bytes = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
            utf8Bytes[i] = reader.u8();
        }
        const paddedSize = Math.ceil(size / 4) * 4;
        const padding = paddedSize - size;
        reader.skip(padding);
        return new TextDecoder('utf-8').decode(utf8Bytes);
    }
    readEnum() {
        return this.readInt();
    }
    readArray(size, elementReader) {
        const array = [];
        for (let i = 0; i < size; i++) {
            array.push(elementReader());
        }
        return array;
    }
    readVarlenArray(elementReader) {
        const size = this.readUnsignedInt();
        return this.readArray(size, elementReader);
    }
}
exports.XdrDecoder = XdrDecoder;
//# sourceMappingURL=XdrDecoder.js.map