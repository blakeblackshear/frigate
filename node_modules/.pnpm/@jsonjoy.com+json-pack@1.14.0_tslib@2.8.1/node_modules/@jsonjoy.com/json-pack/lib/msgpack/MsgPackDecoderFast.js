"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgPackDecoderFast = void 0;
const tslib_1 = require("tslib");
const JsonPackExtension_1 = require("../JsonPackExtension");
const Reader_1 = require("@jsonjoy.com/buffers/lib/Reader");
const sharedCachedUtf8Decoder_1 = tslib_1.__importDefault(require("@jsonjoy.com/buffers/lib/utf8/sharedCachedUtf8Decoder"));
class MsgPackDecoderFast {
    constructor(reader = new Reader_1.Reader(), keyDecoder = sharedCachedUtf8Decoder_1.default) {
        this.reader = reader;
        this.keyDecoder = keyDecoder;
    }
    decode(uint8) {
        this.reader.reset(uint8);
        return this.readAny();
    }
    read(uint8) {
        this.reader.reset(uint8);
        return this.readAny();
    }
    val() {
        return this.readAny();
    }
    readAny() {
        const reader = this.reader;
        const byte = reader.u8();
        if (byte >= 0xe0)
            return byte - 0x100;
        if (byte <= 0xbf) {
            if (byte < 0x90) {
                if (byte <= 0b1111111)
                    return byte;
                return this.obj(byte & 0b1111);
            }
            else {
                if (byte < 0xa0)
                    return this.arr(byte & 0b1111);
                else
                    return reader.utf8(byte & 0b11111);
            }
        }
        if (byte <= 0xd0) {
            if (byte <= 0xc8) {
                if (byte <= 0xc4) {
                    if (byte <= 0xc2)
                        return byte === 0xc2 ? false : byte === 0xc0 ? null : undefined;
                    else
                        return byte === 0xc4 ? reader.buf(reader.u8()) : true;
                }
                else {
                    if (byte <= 0xc6)
                        return byte === 0xc6 ? reader.buf(reader.u32()) : reader.buf(reader.u16());
                    else
                        return byte === 0xc8 ? this.ext(reader.u16()) : this.ext(reader.u8());
                }
            }
            else {
                return byte <= 0xcc
                    ? byte <= 0xca
                        ? byte === 0xca
                            ? reader.f32()
                            : this.ext(reader.u32())
                        : byte === 0xcc
                            ? reader.u8()
                            : reader.f64()
                    : byte <= 0xce
                        ? byte === 0xce
                            ? reader.u32()
                            : reader.u16()
                        : byte === 0xd0
                            ? reader.i8()
                            : reader.u32() * 4294967296 + reader.u32();
            }
        }
        else if (byte <= 0xd8) {
            return byte <= 0xd4
                ? byte <= 0xd2
                    ? byte === 0xd2
                        ? reader.i32()
                        : reader.i16()
                    : byte === 0xd4
                        ? this.ext(1)
                        : reader.i32() * 4294967296 + reader.u32()
                : byte <= 0xd6
                    ? byte === 0xd6
                        ? this.ext(4)
                        : this.ext(2)
                    : byte === 0xd8
                        ? this.ext(16)
                        : this.ext(8);
        }
        else {
            switch (byte) {
                case 0xd9:
                    return reader.utf8(reader.u8());
                case 0xda:
                    return reader.utf8(reader.u16());
                case 0xdb:
                    return reader.utf8(reader.u32());
                case 0xdc:
                    return this.arr(reader.u16());
                case 0xdd:
                    return this.arr(reader.u32());
                case 0xde:
                    return this.obj(reader.u16());
                case 0xdf:
                    return this.obj(reader.u32());
            }
        }
        return undefined;
    }
    str() {
        const reader = this.reader;
        const byte = reader.u8();
        if (byte >> 5 === 0b101)
            return reader.utf8(byte & 0b11111);
        switch (byte) {
            case 0xd9:
                return reader.utf8(reader.u8());
            case 0xda:
                return reader.utf8(reader.u16());
            case 0xdb:
                return reader.utf8(reader.u32());
        }
        return undefined;
    }
    obj(size) {
        const obj = {};
        for (let i = 0; i < size; i++) {
            const key = this.key();
            if (key === '__proto__')
                throw 6;
            obj[key] = this.readAny();
        }
        return obj;
    }
    key() {
        const reader = this.reader;
        const byte = reader.view.getUint8(reader.x);
        if (byte >= 0b10100000 && byte <= 0b10111111) {
            const size = byte & 0b11111;
            const key = this.keyDecoder.decode(reader.uint8, reader.x + 1, size);
            reader.x += 1 + size;
            return key;
        }
        else if (byte === 0xd9) {
            const size = reader.view.getUint8(reader.x + 1);
            if (size < 32) {
                const key = this.keyDecoder.decode(reader.uint8, reader.x + 2, size);
                reader.x += 2 + size;
                return key;
            }
        }
        reader.x++;
        switch (byte) {
            case 0xd9:
                return reader.utf8(reader.u8());
            case 0xda:
                return reader.utf8(reader.u16());
            case 0xdb:
                return reader.utf8(reader.u32());
            default:
                return '';
        }
    }
    arr(size) {
        const arr = [];
        for (let i = 0; i < size; i++)
            arr.push(this.readAny());
        return arr;
    }
    ext(size) {
        const reader = this.reader;
        const type = reader.u8();
        const end = reader.x + size;
        const buf = reader.uint8.subarray(reader.x, end);
        reader.x = end;
        return new JsonPackExtension_1.JsonPackExtension(type, buf);
    }
    back(bytes) {
        this.reader.x -= bytes;
    }
}
exports.MsgPackDecoderFast = MsgPackDecoderFast;
//# sourceMappingURL=MsgPackDecoderFast.js.map