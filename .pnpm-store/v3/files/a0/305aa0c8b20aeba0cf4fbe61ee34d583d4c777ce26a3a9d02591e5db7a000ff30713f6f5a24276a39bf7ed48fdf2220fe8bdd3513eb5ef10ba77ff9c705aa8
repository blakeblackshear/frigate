"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CborDecoder = void 0;
const CborDecoderBase_1 = require("./CborDecoderBase");
const JsonPackValue_1 = require("../JsonPackValue");
class CborDecoder extends CborDecoderBase_1.CborDecoderBase {
    readAsMap() {
        const octet = this.reader.u8();
        const major = octet >> 5;
        const minor = octet & 31;
        switch (major) {
            case 5:
                return this.readMap(minor);
            default:
                throw 0;
        }
    }
    readMap(minor) {
        const length = this.readMinorLen(minor);
        if (length >= 0)
            return this.readMapRaw(length);
        else
            return this.readMapIndef();
    }
    readMapRaw(length) {
        const map = new Map();
        for (let i = 0; i < length; i++) {
            const key = this.readAny();
            const value = this.readAny();
            map.set(key, value);
        }
        return map;
    }
    readMapIndef() {
        const map = new Map();
        while (this.reader.peak() !== 255) {
            const key = this.readAny();
            if (this.reader.peak() === 255)
                throw 7;
            const value = this.readAny();
            map.set(key, value);
        }
        this.reader.x++;
        return map;
    }
    skipN(n) {
        for (let i = 0; i < n; i++)
            this.skipAny();
    }
    skipAny() {
        this.skipAnyRaw(this.reader.u8());
    }
    skipAnyRaw(octet) {
        const major = octet >> 5;
        const minor = octet & 31;
        switch (major) {
            case 0:
            case 1:
                this.skipUNint(minor);
                break;
            case 2:
                this.skipBin(minor);
                break;
            case 3:
                this.skipStr(minor);
                break;
            case 4:
                this.skipArr(minor);
                break;
            case 5:
                this.skipObj(minor);
                break;
            case 7:
                this.skipTkn(minor);
                break;
            case 6:
                this.skipTag(minor);
                break;
        }
    }
    skipMinorLen(minor) {
        if (minor <= 23)
            return minor;
        switch (minor) {
            case 24:
                return this.reader.u8();
            case 25:
                return this.reader.u16();
            case 26:
                return this.reader.u32();
            case 27:
                return Number(this.reader.u64());
            case 31:
                return -1;
            default:
                throw 1;
        }
    }
    skipUNint(minor) {
        if (minor <= 23)
            return;
        switch (minor) {
            case 24:
                return this.reader.skip(1);
            case 25:
                return this.reader.skip(2);
            case 26:
                return this.reader.skip(4);
            case 27:
                return this.reader.skip(8);
            default:
                throw 1;
        }
    }
    skipBin(minor) {
        const length = this.skipMinorLen(minor);
        if (length >= 0)
            this.reader.skip(length);
        else {
            while (this.reader.peak() !== 255)
                this.skipBinChunk();
            this.reader.x++;
        }
    }
    skipBinChunk() {
        const octet = this.reader.u8();
        const major = octet >> 5;
        const minor = octet & 31;
        if (major !== 2)
            throw 2;
        if (minor > 27)
            throw 3;
        this.skipBin(minor);
    }
    skipStr(minor) {
        const length = this.skipMinorLen(minor);
        if (length >= 0)
            this.reader.skip(length);
        else {
            while (this.reader.peak() !== 255)
                this.skipStrChunk();
            this.reader.x++;
        }
    }
    skipStrChunk() {
        const octet = this.reader.u8();
        const major = octet >> 5;
        const minor = octet & 31;
        if (major !== 3)
            throw 4;
        if (minor > 27)
            throw 5;
        this.skipStr(minor);
    }
    skipArr(minor) {
        const length = this.skipMinorLen(minor);
        if (length >= 0)
            this.skipN(length);
        else {
            while (this.reader.peak() !== 255)
                this.skipAny();
            this.reader.x++;
        }
    }
    skipObj(minor) {
        const length = this.readMinorLen(minor);
        if (length >= 0)
            return this.skipN(length * 2);
        else {
            while (this.reader.peak() !== 255) {
                this.skipAny();
                if (this.reader.peak() === 255)
                    throw 7;
                this.skipAny();
            }
            this.reader.x++;
        }
    }
    skipTag(minor) {
        const length = this.skipMinorLen(minor);
        if (length < 0)
            throw 1;
        this.skipAny();
    }
    skipTkn(minor) {
        switch (minor) {
            case 0xf8 & 31:
                this.reader.skip(1);
                return;
            case 0xf9 & 31:
                this.reader.skip(2);
                return;
            case 0xfa & 31:
                this.reader.skip(4);
                return;
            case 0xfb & 31:
                this.reader.skip(8);
                return;
        }
        if (minor <= 23)
            return;
        throw 1;
    }
    validate(value, offset = 0, size = value.length) {
        this.reader.reset(value);
        this.reader.x = offset;
        const start = offset;
        this.skipAny();
        const end = this.reader.x;
        if (end - start !== size)
            throw 8;
    }
    decodeLevel(value) {
        this.reader.reset(value);
        return this.readLevel();
    }
    readLevel() {
        const octet = this.reader.u8();
        const major = octet >> 5;
        const minor = octet & 31;
        switch (major) {
            case 4:
                return this.readArrLevel(minor);
            case 5:
                return this.readObjLevel(minor);
            default:
                return super.readAnyRaw(octet);
        }
    }
    readPrimitiveOrVal() {
        const octet = this.reader.peak();
        const major = octet >> 5;
        switch (major) {
            case 4:
            case 5:
                return this.readAsValue();
            default:
                return this.readAny();
        }
    }
    readAsValue() {
        const reader = this.reader;
        const start = reader.x;
        this.skipAny();
        const end = reader.x;
        return new JsonPackValue_1.JsonPackValue(reader.uint8.subarray(start, end));
    }
    readObjLevel(minor) {
        const length = this.readMinorLen(minor);
        if (length >= 0)
            return this.readObjRawLevel(length);
        else
            return this.readObjIndefLevel();
    }
    readObjRawLevel(length) {
        const obj = {};
        for (let i = 0; i < length; i++) {
            const key = this.key();
            const value = this.readPrimitiveOrVal();
            obj[key] = value;
        }
        return obj;
    }
    readObjIndefLevel() {
        const obj = {};
        while (this.reader.peak() !== 255) {
            const key = this.key();
            if (this.reader.peak() === 255)
                throw 7;
            const value = this.readPrimitiveOrVal();
            obj[key] = value;
        }
        this.reader.x++;
        return obj;
    }
    readArrLevel(minor) {
        const length = this.readMinorLen(minor);
        if (length >= 0)
            return this.readArrRawLevel(length);
        return this.readArrIndefLevel();
    }
    readArrRawLevel(length) {
        const arr = [];
        for (let i = 0; i < length; i++)
            arr.push(this.readPrimitiveOrVal());
        return arr;
    }
    readArrIndefLevel() {
        const arr = [];
        while (this.reader.peak() !== 255)
            arr.push(this.readPrimitiveOrVal());
        this.reader.x++;
        return arr;
    }
    readHdr(expectedMajor) {
        const octet = this.reader.u8();
        const major = octet >> 5;
        if (major !== expectedMajor)
            throw 0;
        const minor = octet & 31;
        if (minor < 24)
            return minor;
        switch (minor) {
            case 24:
                return this.reader.u8();
            case 25:
                return this.reader.u16();
            case 26:
                return this.reader.u32();
            case 27:
                return Number(this.reader.u64());
            case 31:
                return -1;
        }
        throw 1;
    }
    readStrHdr() {
        return this.readHdr(3);
    }
    readObjHdr() {
        return this.readHdr(5);
    }
    readArrHdr() {
        return this.readHdr(4);
    }
    findKey(key) {
        const size = this.readObjHdr();
        for (let i = 0; i < size; i++) {
            const k = this.key();
            if (k === key)
                return this;
            this.skipAny();
        }
        throw 9;
    }
    findIndex(index) {
        const size = this.readArrHdr();
        if (index >= size)
            throw 10;
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
exports.CborDecoder = CborDecoder;
//# sourceMappingURL=CborDecoder.js.map