"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BencodeDecoder = void 0;
const Reader_1 = require("@jsonjoy.com/buffers/lib/Reader");
class BencodeDecoder {
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
        const reader = this.reader;
        const x = reader.x;
        const uint8 = reader.uint8;
        const char = uint8[x];
        switch (char) {
            case 0x69:
                return this.readNum();
            case 0x64:
                return this.readObj();
            case 0x6c:
                return this.readArr();
            case 0x66:
                return this.readFalse();
            case 0x74:
                return this.readTrue();
            case 110:
                return this.readNull();
            case 117:
                return this.readUndef();
            default:
                if (char >= 48 && char <= 57)
                    return this.readBin();
        }
        throw new Error('INVALID_BENCODE');
    }
    readNull() {
        if (this.reader.u8() !== 0x6e)
            throw new Error('INVALID_BENCODE');
        return null;
    }
    readUndef() {
        if (this.reader.u8() !== 117)
            throw new Error('INVALID_BENCODE');
        return undefined;
    }
    readTrue() {
        if (this.reader.u8() !== 0x74)
            throw new Error('INVALID_BENCODE');
        return true;
    }
    readFalse() {
        if (this.reader.u8() !== 0x66)
            throw new Error('INVALID_BENCODE');
        return false;
    }
    readBool() {
        const reader = this.reader;
        switch (reader.uint8[reader.x]) {
            case 0x66:
                return this.readFalse();
            case 0x74:
                return this.readTrue();
            default:
                throw new Error('INVALID_BENCODE');
        }
    }
    readNum() {
        const reader = this.reader;
        const startChar = reader.u8();
        if (startChar !== 0x69)
            throw new Error('INVALID_BENCODE');
        const u8 = reader.uint8;
        let x = reader.x;
        let numStr = '';
        let c = u8[x++];
        let i = 0;
        while (c !== 0x65) {
            numStr += String.fromCharCode(c);
            c = u8[x++];
            if (i > 25)
                throw new Error('INVALID_BENCODE');
            i++;
        }
        if (!numStr)
            throw new Error('INVALID_BENCODE');
        reader.x = x;
        return +numStr;
    }
    readStr() {
        const bin = this.readBin();
        return new TextDecoder().decode(bin);
    }
    readBin() {
        const reader = this.reader;
        const u8 = reader.uint8;
        let lenStr = '';
        let x = reader.x;
        let c = u8[x++];
        let i = 0;
        while (c !== 0x3a) {
            if (c < 48 || c > 57)
                throw new Error('INVALID_BENCODE');
            lenStr += String.fromCharCode(c);
            c = u8[x++];
            if (i > 10)
                throw new Error('INVALID_BENCODE');
            i++;
        }
        reader.x = x;
        const len = +lenStr;
        const bin = reader.buf(len);
        return bin;
    }
    readArr() {
        const reader = this.reader;
        if (reader.u8() !== 0x6c)
            throw new Error('INVALID_BENCODE');
        const arr = [];
        const uint8 = reader.uint8;
        while (true) {
            const char = uint8[reader.x];
            if (char === 0x65) {
                reader.x++;
                return arr;
            }
            arr.push(this.readAny());
        }
    }
    readObj() {
        const reader = this.reader;
        if (reader.u8() !== 0x64)
            throw new Error('INVALID_BENCODE');
        const obj = {};
        const uint8 = reader.uint8;
        while (true) {
            const char = uint8[reader.x];
            if (char === 0x65) {
                reader.x++;
                return obj;
            }
            const key = this.readStr();
            if (key === '__proto__')
                throw new Error('INVALID_KEY');
            obj[key] = this.readAny();
        }
    }
}
exports.BencodeDecoder = BencodeDecoder;
//# sourceMappingURL=BencodeDecoder.js.map