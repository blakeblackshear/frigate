"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IonDecoderBase = void 0;
const tslib_1 = require("tslib");
const Reader_1 = require("@jsonjoy.com/buffers/lib/Reader");
const sharedCachedUtf8Decoder_1 = tslib_1.__importDefault(require("@jsonjoy.com/buffers/lib/utf8/sharedCachedUtf8Decoder"));
const Import_1 = require("./Import");
class IonDecoderBase {
    constructor(reader) {
        this.reader = (reader ?? new Reader_1.Reader());
        this.utf8Decoder = sharedCachedUtf8Decoder_1.default;
    }
    val() {
        const typedesc = this.reader.u8();
        const type = (typedesc >> 4) & 0xf;
        const length = typedesc & 0xf;
        switch (type) {
            case 0:
                return this.readNull(length);
            case 1:
                return this.readBool(length);
            case 2:
                return this.readUint(length);
            case 3:
                return this.readNint(length);
            case 4:
                return this.readFloat(length);
            case 8:
                return this.readString(length);
            case 10:
                return this.readBinary(length);
            case 11:
                return this.readList(length);
            case 13:
                return this.readStruct(length);
            case 14:
                return this.readAnnotation(length);
            default:
                throw new Error(`Unknown Ion type: 0x${type.toString(16)}`);
        }
    }
    readNull(length) {
        if (length === 15)
            return null;
        if (length === 0) {
            this.val();
            return null;
        }
        if (length === 14) {
            const padLength = this.readVUint();
            this.reader.x += padLength;
            this.val();
            return null;
        }
        this.reader.x += length;
        this.val();
        return null;
    }
    readBool(length) {
        if (length === 15)
            return null;
        if (length === 0)
            return false;
        if (length === 1)
            return true;
        throw new Error(`Invalid bool length: ${length}`);
    }
    readUint(length) {
        if (length === 15)
            return null;
        if (length === 0)
            return 0;
        let value = 0;
        for (let i = 0; i < length; i++) {
            value = value * 256 + this.reader.u8();
        }
        return value;
    }
    readNint(length) {
        if (length === 15)
            return null;
        if (length === 0)
            throw new Error('Negative zero is illegal');
        let value = 0;
        for (let i = 0; i < length; i++) {
            value = value * 256 + this.reader.u8();
        }
        return -value;
    }
    readFloat(length) {
        if (length === 15)
            return null;
        if (length === 0)
            return 0.0;
        if (length === 4)
            return this.reader.f32();
        if (length === 8)
            return this.reader.f64();
        throw new Error(`Unsupported float length: ${length}`);
    }
    readString(length) {
        if (length === 15)
            return null;
        let actualLength = length;
        if (length === 14) {
            actualLength = this.readVUint();
        }
        if (actualLength === 0)
            return '';
        return this.reader.utf8(actualLength);
    }
    readBinary(length) {
        if (length === 15)
            return null;
        let actualLength = length;
        if (length === 14) {
            actualLength = this.readVUint();
        }
        if (actualLength === 0)
            return new Uint8Array(0);
        return this.reader.buf(actualLength);
    }
    readList(length) {
        if (length === 15)
            return null;
        let actualLength = length;
        if (length === 14) {
            actualLength = this.readVUint();
        }
        if (actualLength === 0)
            return [];
        const endPos = this.reader.x + actualLength;
        const list = [];
        while (this.reader.x < endPos) {
            list.push(this.val());
        }
        if (this.reader.x !== endPos) {
            throw new Error('List parsing error: incorrect length');
        }
        return list;
    }
    readStruct(length) {
        if (length === 15)
            return null;
        let actualLength = length;
        if (length === 14) {
            actualLength = this.readVUint();
        }
        if (actualLength === 0)
            return {};
        const endPos = this.reader.x + actualLength;
        const struct = {};
        while (this.reader.x < endPos) {
            const fieldNameId = this.readVUint();
            const fieldName = this.getSymbolText(fieldNameId);
            const fieldValue = this.val();
            struct[fieldName] = fieldValue;
        }
        if (this.reader.x !== endPos) {
            throw new Error('Struct parsing error: incorrect length');
        }
        return struct;
    }
    readAnnotation(length) {
        if (length < 3) {
            throw new Error('Annotation wrapper must have at least 3 bytes');
        }
        let actualLength = length;
        if (length === 14) {
            actualLength = this.readVUint();
        }
        const annotLength = this.readVUint();
        const endAnnotPos = this.reader.x + annotLength;
        while (this.reader.x < endAnnotPos) {
            this.readVUint();
        }
        if (this.reader.x !== endAnnotPos) {
            throw new Error('Annotation parsing error: incorrect annotation length');
        }
        return this.val();
    }
    readVUint() {
        let value = 0;
        let byte;
        do {
            byte = this.reader.u8();
            value = (value << 7) | (byte & 0x7f);
        } while ((byte & 0x80) === 0);
        return value;
    }
    readVInt() {
        const firstByte = this.reader.u8();
        if (firstByte & 0x80) {
            const sign = firstByte & 0x40 ? -1 : 1;
            const magnitude = firstByte & 0x3f;
            return sign * magnitude;
        }
        const sign = firstByte & 0x40 ? -1 : 1;
        let magnitude = firstByte & 0x3f;
        let byte;
        do {
            byte = this.reader.u8();
            magnitude = (magnitude << 7) | (byte & 0x7f);
        } while ((byte & 0x80) === 0);
        return sign * magnitude;
    }
    getSymbolText(symbolId) {
        if (!this.symbols) {
            throw new Error('No symbol table available');
        }
        const symbol = this.symbols.getText(symbolId);
        if (symbol === undefined) {
            throw new Error(`Unknown symbol ID: ${symbolId}`);
        }
        return symbol;
    }
    validateBVM() {
        const bvm = this.reader.u32();
        if (bvm !== 0xe00100ea) {
            throw new Error(`Invalid Ion Binary Version Marker: 0x${bvm.toString(16)}`);
        }
    }
    readSymbolTable() {
        if (this.reader.x < this.reader.uint8.length) {
            const nextByte = this.reader.peak();
            const type = (nextByte >> 4) & 0xf;
            if (type === 14) {
                const annotValue = this.val();
                if (annotValue && typeof annotValue === 'object' && !Array.isArray(annotValue)) {
                    const symbolsKey = 'symbols';
                    const obj = annotValue;
                    if (symbolsKey in obj && Array.isArray(obj[symbolsKey])) {
                        const newSymbols = obj[symbolsKey];
                        this.symbols = new Import_1.Import(this.symbols || null, newSymbols);
                    }
                }
            }
        }
    }
}
exports.IonDecoderBase = IonDecoderBase;
//# sourceMappingURL=IonDecoderBase.js.map