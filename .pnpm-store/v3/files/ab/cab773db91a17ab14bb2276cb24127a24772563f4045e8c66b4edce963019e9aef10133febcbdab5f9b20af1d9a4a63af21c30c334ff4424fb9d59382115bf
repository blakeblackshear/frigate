"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RespDecoder = void 0;
const Reader_1 = require("@jsonjoy.com/buffers/lib/Reader");
const extensions_1 = require("./extensions");
const isUtf8_1 = require("@jsonjoy.com/buffers/lib/utf8/isUtf8");
class RespDecoder {
    constructor(reader = new Reader_1.Reader()) {
        this.reader = reader;
        this.tryUtf8 = false;
    }
    read(uint8) {
        this.reader.reset(uint8);
        return this.readAny();
    }
    decode(uint8) {
        this.reader.reset(uint8);
        return this.readAny();
    }
    val() {
        return this.readAny();
    }
    readAny() {
        const reader = this.reader;
        const type = reader.u8();
        switch (type) {
            case 58:
                return this.readInt();
            case 44:
                return this.readFloat();
            case 43:
                return this.readStrSimple();
            case 36:
                return this.readStrBulk();
            case 35:
                return this.readBool();
            case 95:
                return reader.skip(2), null;
            case 37:
                return this.readObj();
            case 42:
                return this.readArr();
            case 61:
                return this.readStrVerbatim();
            case 62:
                return new extensions_1.RespPush(this.readArr() || []);
            case 40:
                return this.readBigint();
            case 126:
                return this.readSet();
            case 45:
                return this.readErrSimple();
            case 33:
                return this.readErrBulk();
            case 124:
                return new extensions_1.RespAttributes(this.readObj());
        }
        throw new Error('UNKNOWN_TYPE');
    }
    readLength() {
        const reader = this.reader;
        let number = 0;
        while (true) {
            const c = reader.u8();
            if (c === 13)
                return reader.skip(1), number;
            number = number * 10 + (c - 48);
        }
    }
    readCmd() {
        const reader = this.reader;
        const type = reader.u8();
        if (type !== 42)
            throw new Error('INVALID_COMMAND');
        const c = reader.peak();
        if (c === 45)
            throw new Error('INVALID_COMMAND');
        const length = this.readLength();
        if (length === 0)
            throw new Error('INVALID_COMMAND');
        const cmd = this.readAsciiAsStrBulk().toUpperCase();
        const args = [cmd];
        this.tryUtf8 = false;
        for (let i = 1; i < length; i++) {
            const type = reader.u8();
            if (type !== 36)
                throw new Error('INVALID_COMMAND');
            args.push(this.readStrBulk());
        }
        return args;
    }
    readBool() {
        const reader = this.reader;
        const c = reader.u8();
        reader.skip(2);
        return c === 116;
    }
    readInt() {
        const reader = this.reader;
        let negative = false;
        let c = reader.u8();
        let number = 0;
        if (c === 45) {
            negative = true;
        }
        else if (c !== 43)
            number = c - 48;
        while (true) {
            c = reader.u8();
            if (c === 13) {
                reader.skip(1);
                return negative ? -number : number;
            }
            number = number * 10 + (c - 48);
        }
    }
    readFloat() {
        const reader = this.reader;
        const x = reader.x;
        while (true) {
            const c = reader.u8();
            if (c !== 13)
                continue;
            const length = reader.x - x - 1;
            reader.x = x;
            const str = reader.ascii(length);
            switch (length) {
                case 3:
                    switch (str) {
                        case 'inf':
                            return reader.skip(2), Infinity;
                        case 'nan':
                            return reader.skip(2), NaN;
                    }
                    break;
                case 4:
                    if (str === '-inf') {
                        return reader.skip(2), -Infinity;
                    }
                    break;
            }
            reader.skip(2);
            return Number(str);
        }
    }
    readBigint() {
        const reader = this.reader;
        const x = reader.x;
        while (true) {
            const c = reader.u8();
            if (c !== 13)
                continue;
            const length = reader.x - x;
            reader.x = x;
            const str = reader.ascii(length);
            reader.skip(1);
            return BigInt(str);
        }
    }
    readStrSimple() {
        const reader = this.reader;
        const x = reader.x;
        while (true) {
            const c = reader.u8();
            if (c !== 13)
                continue;
            const size = reader.x - x - 1;
            reader.x = x;
            const str = reader.utf8(size);
            reader.skip(2);
            return str;
        }
    }
    readStrBulk() {
        const reader = this.reader;
        if (reader.peak() === 45) {
            reader.skip(4);
            return null;
        }
        const length = this.readLength();
        let res;
        if (this.tryUtf8 && (0, isUtf8_1.isUtf8)(reader.uint8, reader.x, length))
            res = reader.utf8(length);
        else
            res = reader.buf(length);
        reader.skip(2);
        return res;
    }
    readAsciiAsStrBulk() {
        const reader = this.reader;
        reader.skip(1);
        const length = this.readLength();
        const buf = reader.ascii(length);
        reader.skip(2);
        return buf;
    }
    readStrVerbatim() {
        const reader = this.reader;
        const length = this.readLength();
        const u32 = reader.u32();
        const isTxt = u32 === 1954051130;
        if (isTxt) {
            const str = reader.utf8(length - 4);
            reader.skip(2);
            return str;
        }
        const buf = reader.buf(length - 4);
        reader.skip(2);
        return buf;
    }
    readErrSimple() {
        const reader = this.reader;
        const x = reader.x;
        while (true) {
            const c = reader.u8();
            if (c !== 13)
                continue;
            const size = reader.x - x - 1;
            reader.x = x;
            const str = reader.utf8(size);
            reader.skip(2);
            return new Error(str);
        }
    }
    readErrBulk() {
        const reader = this.reader;
        const length = this.readLength();
        const message = reader.utf8(length);
        reader.skip(2);
        return new Error(message);
    }
    readArr() {
        const reader = this.reader;
        const c = reader.peak();
        if (c === 45) {
            reader.skip(4);
            return null;
        }
        const length = this.readLength();
        const arr = [];
        for (let i = 0; i < length; i++)
            arr.push(this.readAny());
        return arr;
    }
    readSet() {
        const length = this.readLength();
        const set = new Set();
        for (let i = 0; i < length; i++)
            set.add(this.readAny());
        return set;
    }
    readObj() {
        const length = this.readLength();
        const obj = {};
        for (let i = 0; i < length; i++) {
            const key = this.readAny() + '';
            obj[key] = this.readAny();
        }
        return obj;
    }
    skipN(n) {
        for (let i = 0; i < n; i++)
            this.skipAny();
    }
    skipAny() {
        const reader = this.reader;
        const type = reader.u8();
        switch (type) {
            case 58:
                return this.skipInt();
            case 44:
                return this.skipFloat();
            case 43:
                return this.skipStrSimple();
            case 36:
                return this.skipStrBulk();
            case 35:
                return this.skipBool();
            case 95:
                return reader.skip(2);
            case 37:
                return this.skipObj();
            case 42:
                return this.skipArr();
            case 61:
                return this.skipStrVerbatim();
            case 62:
                return this.skipArr();
            case 40:
                return this.skipBigint();
            case 126:
                return this.skipSet();
            case 45:
                return this.skipErrSimple();
            case 33:
                return this.skipErrBulk();
            case 124:
                return this.skipObj();
        }
        throw new Error('UNKNOWN_TYPE');
    }
    skipBool() {
        this.reader.skip(3);
    }
    skipInt() {
        const reader = this.reader;
        while (true) {
            if (reader.u8() !== 13)
                continue;
            reader.skip(1);
            return;
        }
    }
    skipFloat() {
        const reader = this.reader;
        while (true) {
            if (reader.u8() !== 13)
                continue;
            reader.skip(1);
            return;
        }
    }
    skipBigint() {
        const reader = this.reader;
        while (true) {
            if (reader.u8() !== 13)
                continue;
            reader.skip(1);
            return;
        }
    }
    skipStrSimple() {
        const reader = this.reader;
        while (true) {
            if (reader.u8() !== 13)
                continue;
            reader.skip(1);
            return;
        }
    }
    skipStrBulk() {
        const reader = this.reader;
        if (reader.peak() === 45) {
            reader.skip(4);
            return;
        }
        reader.skip(this.readLength() + 2);
    }
    skipStrVerbatim() {
        const length = this.readLength();
        this.reader.skip(length + 2);
    }
    skipErrSimple() {
        const reader = this.reader;
        while (true) {
            if (reader.u8() !== 13)
                continue;
            reader.skip(1);
            return;
        }
    }
    skipErrBulk() {
        const length = this.readLength();
        this.reader.skip(length + 2);
    }
    skipArr() {
        const reader = this.reader;
        const c = reader.peak();
        if (c === 45) {
            reader.skip(4);
            return;
        }
        const length = this.readLength();
        for (let i = 0; i < length; i++)
            this.skipAny();
    }
    skipSet() {
        const length = this.readLength();
        for (let i = 0; i < length; i++)
            this.skipAny();
    }
    skipObj() {
        const length = this.readLength();
        for (let i = 0; i < length; i++) {
            this.skipAny();
            this.skipAny();
        }
    }
}
exports.RespDecoder = RespDecoder;
//# sourceMappingURL=RespDecoder.js.map