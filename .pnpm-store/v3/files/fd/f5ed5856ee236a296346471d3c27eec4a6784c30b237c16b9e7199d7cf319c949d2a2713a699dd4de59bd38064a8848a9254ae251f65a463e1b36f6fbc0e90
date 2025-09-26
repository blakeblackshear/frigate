"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonDecoder = exports.readKey = void 0;
const decodeUtf8_1 = require("@jsonjoy.com/buffers/lib/utf8/decodeUtf8");
const Reader_1 = require("@jsonjoy.com/buffers/lib/Reader");
const fromBase64Bin_1 = require("@jsonjoy.com/base64/lib/fromBase64Bin");
const util_1 = require("./util");
const REGEX_REPLACE_ESCAPED_CHARS = /\\(b|f|n|r|t|"|\/|\\)/g;
const escapedCharReplacer = (char) => {
    switch (char) {
        case '\\b':
            return '\b';
        case '\\f':
            return '\f';
        case '\\n':
            return '\n';
        case '\\r':
            return '\r';
        case '\\t':
            return '\t';
        case '\\"':
            return '"';
        case '\\/':
            return '/';
        case '\\\\':
            return '\\';
    }
    return char;
};
const hasBinaryPrefix = (u8, x) => u8[x] === 0x64 &&
    u8[x + 1] === 0x61 &&
    u8[x + 2] === 0x74 &&
    u8[x + 3] === 0x61 &&
    u8[x + 4] === 0x3a &&
    u8[x + 5] === 0x61 &&
    u8[x + 6] === 0x70 &&
    u8[x + 7] === 0x70 &&
    u8[x + 8] === 0x6c &&
    u8[x + 9] === 0x69 &&
    u8[x + 10] === 0x63 &&
    u8[x + 11] === 0x61 &&
    u8[x + 12] === 0x74 &&
    u8[x + 13] === 0x69 &&
    u8[x + 14] === 0x6f &&
    u8[x + 15] === 0x6e &&
    u8[x + 16] === 0x2f &&
    u8[x + 17] === 0x6f &&
    u8[x + 18] === 0x63 &&
    u8[x + 19] === 0x74 &&
    u8[x + 20] === 0x65 &&
    u8[x + 21] === 0x74 &&
    u8[x + 22] === 0x2d &&
    u8[x + 23] === 0x73 &&
    u8[x + 24] === 0x74 &&
    u8[x + 25] === 0x72 &&
    u8[x + 26] === 0x65 &&
    u8[x + 27] === 0x61 &&
    u8[x + 28] === 0x6d &&
    u8[x + 29] === 0x3b &&
    u8[x + 30] === 0x62 &&
    u8[x + 31] === 0x61 &&
    u8[x + 32] === 0x73 &&
    u8[x + 33] === 0x65 &&
    u8[x + 34] === 0x36 &&
    u8[x + 35] === 0x34 &&
    u8[x + 36] === 0x2c;
const isUndefined = (u8, x) => u8[x++] === 0x61 &&
    u8[x++] === 0x74 &&
    u8[x++] === 0x61 &&
    u8[x++] === 0x3a &&
    u8[x++] === 0x61 &&
    u8[x++] === 0x70 &&
    u8[x++] === 0x70 &&
    u8[x++] === 0x6c &&
    u8[x++] === 0x69 &&
    u8[x++] === 0x63 &&
    u8[x++] === 0x61 &&
    u8[x++] === 0x74 &&
    u8[x++] === 0x69 &&
    u8[x++] === 0x6f &&
    u8[x++] === 0x6e &&
    u8[x++] === 0x2f &&
    u8[x++] === 0x63 &&
    u8[x++] === 0x62 &&
    u8[x++] === 0x6f &&
    u8[x++] === 0x72 &&
    u8[x++] === 0x2c &&
    u8[x++] === 0x62 &&
    u8[x++] === 0x61 &&
    u8[x++] === 0x73 &&
    u8[x++] === 0x65 &&
    u8[x++] === 0x36 &&
    u8[x++] === 0x34 &&
    u8[x++] === 0x3b &&
    u8[x++] === 0x39 &&
    u8[x++] === 0x77 &&
    u8[x++] === 0x3d &&
    u8[x++] === 0x3d &&
    u8[x++] === 0x22;
const fromCharCode = String.fromCharCode;
const readKey = (reader) => {
    const buf = reader.uint8;
    const len = buf.length;
    const points = [];
    let x = reader.x;
    let prev = 0;
    while (x < len) {
        let code = buf[x++];
        if ((code & 0x80) === 0) {
            if (prev === 92) {
                switch (code) {
                    case 98:
                        code = 8;
                        break;
                    case 102:
                        code = 12;
                        break;
                    case 110:
                        code = 10;
                        break;
                    case 114:
                        code = 13;
                        break;
                    case 116:
                        code = 9;
                        break;
                    case 34:
                        code = 34;
                        break;
                    case 47:
                        code = 47;
                        break;
                    case 92:
                        code = 92;
                        break;
                    default:
                        throw new Error('Invalid JSON');
                }
                prev = 0;
            }
            else {
                if (code === 34)
                    break;
                prev = code;
                if (prev === 92)
                    continue;
            }
        }
        else {
            const octet2 = buf[x++] & 0x3f;
            if ((code & 0xe0) === 0xc0) {
                code = ((code & 0x1f) << 6) | octet2;
            }
            else {
                const octet3 = buf[x++] & 0x3f;
                if ((code & 0xf0) === 0xe0) {
                    code = ((code & 0x1f) << 12) | (octet2 << 6) | octet3;
                }
                else {
                    if ((code & 0xf8) === 0xf0) {
                        const octet4 = buf[x++] & 0x3f;
                        let unit = ((code & 0x07) << 0x12) | (octet2 << 0x0c) | (octet3 << 0x06) | octet4;
                        if (unit > 0xffff) {
                            unit -= 0x10000;
                            const unit0 = ((unit >>> 10) & 0x3ff) | 0xd800;
                            unit = 0xdc00 | (unit & 0x3ff);
                            points.push(unit0);
                            code = unit;
                        }
                        else {
                            code = unit;
                        }
                    }
                }
            }
        }
        points.push(code);
    }
    reader.x = x;
    return fromCharCode.apply(String, points);
};
exports.readKey = readKey;
class JsonDecoder {
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
        this.skipWhitespace();
        const reader = this.reader;
        const x = reader.x;
        const uint8 = reader.uint8;
        const char = uint8[x];
        switch (char) {
            case 34: {
                if (uint8[x + 1] === 0x64) {
                    const bin = this.tryReadBin();
                    if (bin)
                        return bin;
                    if (isUndefined(uint8, x + 2)) {
                        reader.x = x + 35;
                        return undefined;
                    }
                }
                return this.readStr();
            }
            case 91:
                return this.readArr();
            case 102:
                return this.readFalse();
            case 110:
                return this.readNull();
            case 116:
                return this.readTrue();
            case 123:
                return this.readObj();
            default:
                if ((char >= 48 && char <= 57) || char === 45)
                    return this.readNum();
                throw new Error('Invalid JSON');
        }
    }
    skipWhitespace() {
        const reader = this.reader;
        const uint8 = reader.uint8;
        let x = reader.x;
        let char = 0;
        while (true) {
            char = uint8[x];
            switch (char) {
                case 32:
                case 9:
                case 10:
                case 13:
                    x++;
                    continue;
                default:
                    reader.x = x;
                    return;
            }
        }
    }
    readNull() {
        if (this.reader.u32() !== 0x6e756c6c)
            throw new Error('Invalid JSON');
        return null;
    }
    readTrue() {
        if (this.reader.u32() !== 0x74727565)
            throw new Error('Invalid JSON');
        return true;
    }
    readFalse() {
        const reader = this.reader;
        if (reader.u8() !== 0x66 || reader.u32() !== 0x616c7365)
            throw new Error('Invalid JSON');
        return false;
    }
    readBool() {
        const reader = this.reader;
        switch (reader.uint8[reader.x]) {
            case 102:
                return this.readFalse();
            case 116:
                return this.readTrue();
            default:
                throw new Error('Invalid JSON');
        }
    }
    readNum() {
        const reader = this.reader;
        const uint8 = reader.uint8;
        let x = reader.x;
        let c = uint8[x++];
        const c1 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c2 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c3 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c4 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c5 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c6 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c7 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c8 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c9 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c10 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c11 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c12 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c13 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c14 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c15 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c16 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c17 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c18 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17, c18);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c19 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17, c18, c19);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c20 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17, c18, c19, c20);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c21 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17, c18, c19, c20, c21);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c22 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17, c18, c19, c20, c21, c22);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c23 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17, c18, c19, c20, c21, c22, c23);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        const c24 = c;
        c = uint8[x++];
        if (!c || ((c < 45 || c > 57) && c !== 43 && c !== 69 && c !== 101)) {
            reader.x = x - 1;
            const num = +fromCharCode(c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16, c17, c18, c19, c20, c21, c22, c23, c24);
            if (num !== num)
                throw new Error('Invalid JSON');
            return num;
        }
        throw new Error('Invalid JSON');
    }
    readStr() {
        const reader = this.reader;
        const uint8 = reader.uint8;
        const char = uint8[reader.x++];
        if (char !== 0x22)
            throw new Error('Invalid JSON');
        const x0 = reader.x;
        const x1 = (0, util_1.findEndingQuote)(uint8, x0);
        let str = (0, decodeUtf8_1.decodeUtf8)(uint8, x0, x1 - x0);
        str = str.replace(REGEX_REPLACE_ESCAPED_CHARS, escapedCharReplacer);
        reader.x = x1 + 1;
        return str;
    }
    tryReadBin() {
        const reader = this.reader;
        const u8 = reader.uint8;
        let x = reader.x;
        if (u8[x++] !== 0x22)
            return undefined;
        const hasDataUrlPrefix = hasBinaryPrefix(u8, x);
        if (!hasDataUrlPrefix)
            return undefined;
        x += 37;
        const x0 = x;
        x = (0, util_1.findEndingQuote)(u8, x);
        reader.x = x0;
        const bin = (0, fromBase64Bin_1.fromBase64Bin)(reader.view, x0, x - x0);
        reader.x = x + 1;
        return bin;
    }
    readBin() {
        const reader = this.reader;
        const u8 = reader.uint8;
        let x = reader.x;
        if (u8[x++] !== 0x22)
            throw new Error('Invalid JSON');
        const hasDataUrlPrefix = hasBinaryPrefix(u8, x);
        if (!hasDataUrlPrefix)
            throw new Error('Invalid JSON');
        x += 37;
        const x0 = x;
        x = (0, util_1.findEndingQuote)(u8, x);
        reader.x = x0;
        const bin = (0, fromBase64Bin_1.fromBase64Bin)(reader.view, x0, x - x0);
        reader.x = x + 1;
        return bin;
    }
    readArr() {
        const reader = this.reader;
        if (reader.u8() !== 0x5b)
            throw new Error('Invalid JSON');
        const arr = [];
        const uint8 = reader.uint8;
        let first = true;
        while (true) {
            this.skipWhitespace();
            const char = uint8[reader.x];
            if (char === 0x5d)
                return reader.x++, arr;
            if (char === 0x2c)
                reader.x++;
            else if (!first)
                throw new Error('Invalid JSON');
            this.skipWhitespace();
            arr.push(this.readAny());
            first = false;
        }
    }
    readObj() {
        const reader = this.reader;
        if (reader.u8() !== 0x7b)
            throw new Error('Invalid JSON');
        const obj = {};
        const uint8 = reader.uint8;
        let first = true;
        while (true) {
            this.skipWhitespace();
            let char = uint8[reader.x];
            if (char === 0x7d)
                return reader.x++, obj;
            if (char === 0x2c)
                reader.x++;
            else if (!first)
                throw new Error('Invalid JSON');
            this.skipWhitespace();
            char = uint8[reader.x++];
            if (char !== 0x22)
                throw new Error('Invalid JSON');
            const key = (0, exports.readKey)(reader);
            if (key === '__proto__')
                throw new Error('Invalid JSON');
            this.skipWhitespace();
            if (reader.u8() !== 0x3a)
                throw new Error('Invalid JSON');
            this.skipWhitespace();
            obj[key] = this.readAny();
            first = false;
        }
    }
}
exports.JsonDecoder = JsonDecoder;
//# sourceMappingURL=JsonDecoder.js.map