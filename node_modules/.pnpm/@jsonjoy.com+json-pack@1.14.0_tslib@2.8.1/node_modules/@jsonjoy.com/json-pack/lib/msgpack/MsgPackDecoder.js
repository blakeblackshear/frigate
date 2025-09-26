"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgPackDecoder = void 0;
const _1 = require(".");
const MsgPackDecoderFast_1 = require("./MsgPackDecoderFast");
class MsgPackDecoder extends MsgPackDecoderFast_1.MsgPackDecoderFast {
    skipAny() {
        const byte = this.reader.u8();
        if (byte >= 0xe0)
            return 1;
        if (byte <= 0xbf) {
            if (byte < 0x90) {
                if (byte <= 0b1111111)
                    return 1;
                return 1 + this.skipObj(byte & 0b1111);
            }
            else {
                if (byte < 0xa0)
                    return 1 + this.skipArr(byte & 0b1111);
                else
                    return 1 + this.skip(byte & 0b11111);
            }
        }
        if (byte <= 0xd0) {
            if (byte <= 0xc8) {
                if (byte <= 0xc4) {
                    if (byte <= 0xc2)
                        return byte === 0xc2 ? 1 : 1;
                    else
                        return byte === 0xc4 ? 2 + this.skip(this.reader.u8()) : 1;
                }
                else {
                    if (byte <= 0xc6)
                        return byte === 0xc6 ? 5 + this.skip(this.reader.u32()) : 3 + this.skip(this.reader.u16());
                    else
                        return byte === 0xc8 ? 4 + this.skip(this.reader.u16()) : 3 + this.skip(this.reader.u8());
                }
            }
            else {
                return byte <= 0xcc
                    ? byte <= 0xca
                        ? byte === 0xca
                            ? 1 + this.skip(4)
                            : 1 + 1 + 4 + this.skip(this.reader.u32())
                        : byte === 0xcc
                            ? 1 + this.skip(1)
                            : 1 + this.skip(8)
                    : byte <= 0xce
                        ? byte === 0xce
                            ? 1 + this.skip(4)
                            : 1 + this.skip(2)
                        : byte === 0xd0
                            ? 1 + this.skip(1)
                            : 1 + this.skip(8);
            }
        }
        else if (byte <= 0xd8) {
            return byte <= 0xd4
                ? byte <= 0xd2
                    ? byte === 0xd2
                        ? 1 + this.skip(4)
                        : 1 + this.skip(2)
                    : byte === 0xd4
                        ? 1 + this.skip(2)
                        : 1 + this.skip(8)
                : byte <= 0xd6
                    ? byte === 0xd6
                        ? 1 + this.skip(5)
                        : 1 + this.skip(3)
                    : byte === 0xd8
                        ? 1 + this.skip(17)
                        : 1 + this.skip(9);
        }
        else {
            switch (byte) {
                case 0xd9:
                    return 2 + this.skip(this.reader.u8());
                case 0xda:
                    return 3 + this.skip(this.reader.u16());
                case 0xdb:
                    return 5 + this.skip(this.reader.u32());
                case 0xdc:
                    return 3 + this.skipArr(this.reader.u16());
                case 0xdd:
                    return 5 + this.skipArr(this.reader.u32());
                case 0xde:
                    return 3 + this.skipObj(this.reader.u16());
                case 0xdf:
                    return 5 + this.skipObj(this.reader.u32());
            }
        }
        return 1;
    }
    skipArr(size) {
        let length = 0;
        for (let i = 0; i < size; i++)
            length += this.skipAny();
        return length;
    }
    skipObj(size) {
        let length = 0;
        for (let i = 0; i < size; i++) {
            length += this.skipAny() + this.skipAny();
        }
        return length;
    }
    readLevel(uint8) {
        this.reader.reset(uint8);
        return this.valOneLevel();
    }
    valOneLevel() {
        const byte = this.reader.view.getUint8(this.reader.x);
        const isMap = byte === 0xde || byte === 0xdf || byte >> 4 === 0b1000;
        if (isMap) {
            this.reader.x++;
            const size = byte === 0xde ? this.reader.u16() : byte === 0xdf ? this.reader.u32() : byte & 0b1111;
            const obj = {};
            for (let i = 0; i < size; i++) {
                const key = this.key();
                obj[key] = this.primitive();
            }
            return obj;
        }
        const isArray = byte === 0xdc || byte === 0xdd || byte >> 4 === 0b1001;
        if (isArray) {
            this.reader.x++;
            const size = byte === 0xdc ? this.reader.u16() : byte === 0xdd ? this.reader.u32() : byte & 0b1111;
            const arr = [];
            for (let i = 0; i < size; i++)
                arr.push(this.primitive());
            return arr;
        }
        return this.readAny();
    }
    primitive() {
        const reader = this.reader;
        const byte = reader.view.getUint8(reader.x);
        const isMapOrArray = byte === 0xde || byte === 0xdf || byte === 0xdc || byte === 0xdd || byte >> 5 === 0b100;
        if (isMapOrArray) {
            const length = this.skipAny();
            reader.x -= length;
            const buf = reader.buf(length);
            return new _1.JsonPackValue(buf);
        }
        return this.readAny();
    }
    skip(length) {
        this.reader.x += length;
        return length;
    }
    validate(value, offset = 0, size = value.length) {
        this.reader.reset(value);
        this.reader.x = offset;
        const start = offset;
        this.skipAny();
        const end = this.reader.x;
        if (end - start !== size)
            throw new Error('INVALID_SIZE');
    }
    readObjHdr() {
        const reader = this.reader;
        const byte = reader.u8();
        const isFixMap = byte >> 4 === 0b1000;
        if (isFixMap)
            return byte & 0b1111;
        switch (byte) {
            case 0xde:
                return reader.u16();
            case 0xdf:
                return reader.u32();
        }
        throw new Error('NOT_OBJ');
    }
    readStrHdr() {
        const reader = this.reader;
        const byte = reader.u8();
        if (byte >> 5 === 0b101)
            return byte & 0b11111;
        switch (byte) {
            case 0xd9:
                return reader.u8();
            case 0xda:
                return reader.u16();
            case 0xdb:
                return reader.u32();
        }
        throw new Error('NOT_STR');
    }
    findKey(key) {
        const size = this.readObjHdr();
        for (let i = 0; i < size; i++) {
            const k = this.key();
            if (k === key)
                return this;
            this.skipAny();
        }
        throw new Error('KEY_NOT_FOUND');
    }
    readArrHdr() {
        const reader = this.reader;
        const byte = reader.u8();
        const isFixArr = byte >> 4 === 0b1001;
        if (isFixArr)
            return byte & 0b1111;
        switch (byte) {
            case 0xdc:
                return this.reader.u16();
            case 0xdd:
                return this.reader.u32();
        }
        throw new Error('NOT_ARR');
    }
    findIndex(index) {
        const size = this.readArrHdr();
        if (index >= size)
            throw new Error('INDEX_OUT_OF_BOUNDS');
        for (let i = 0; i < index; i++)
            this.skipAny();
        return this;
    }
    find(path) {
        for (let i = 0; i < path.length; i++) {
            const segment = path[i];
            if (typeof segment === 'string')
                this.findKey(segment);
            else
                this.findIndex(segment);
        }
        return this;
    }
}
exports.MsgPackDecoder = MsgPackDecoder;
//# sourceMappingURL=MsgPackDecoder.js.map