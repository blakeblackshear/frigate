"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RespEncoder = void 0;
const Writer_1 = require("@jsonjoy.com/buffers/lib/Writer");
const utf8_1 = require("@jsonjoy.com/util/lib/strings/utf8");
const extensions_1 = require("./extensions");
const JsonPackExtension_1 = require("../JsonPackExtension");
const REG_RN = /[\r\n]/;
const isSafeInteger = Number.isSafeInteger;
class RespEncoder {
    constructor(writer = new Writer_1.Writer()) {
        this.writer = writer;
    }
    encode(value) {
        this.writeAny(value);
        return this.writer.flush();
    }
    encodeToSlice(value) {
        this.writeAny(value);
        return this.writer.flushSlice();
    }
    writeAny(value) {
        switch (typeof value) {
            case 'number':
                return this.writeNumber(value);
            case 'string':
                return this.writeStr(value);
            case 'boolean':
                return this.writeBoolean(value);
            case 'object': {
                if (!value)
                    return this.writeNull();
                if (value instanceof Array)
                    return this.writeArr(value);
                if (value instanceof Uint8Array)
                    return this.writeBin(value);
                if (value instanceof Error)
                    return this.writeErr(value.message);
                if (value instanceof Set)
                    return this.writeSet(value);
                if (value instanceof JsonPackExtension_1.JsonPackExtension) {
                    if (value instanceof extensions_1.RespPush)
                        return this.writePush(value.val);
                    if (value instanceof extensions_1.RespVerbatimString)
                        return this.writeVerbatimStr('txt', value.val);
                    if (value instanceof extensions_1.RespAttributes)
                        return this.writeAttr(value.val);
                }
                return this.writeObj(value);
            }
            case 'undefined':
                return this.writeUndef();
            case 'bigint':
                return this.writeBigInt(value);
            default:
                return this.writeUnknown(value);
        }
    }
    writeLength(length) {
        const writer = this.writer;
        if (length < 100) {
            if (length < 10) {
                writer.u8(length + 48);
                return;
            }
            const octet1 = length % 10;
            const octet2 = (length - octet1) / 10;
            writer.u16(((octet2 + 48) << 8) + octet1 + 48);
            return;
        }
        let digits = 1;
        let pow = 10;
        while (length >= pow) {
            digits++;
            pow *= 10;
        }
        writer.ensureCapacity(digits);
        const uint8 = writer.uint8;
        const x = writer.x;
        const newX = x + digits;
        let i = newX - 1;
        while (i >= x) {
            const remainder = length % 10;
            uint8[i--] = remainder + 48;
            length = (length - remainder) / 10;
        }
        writer.x = newX;
    }
    encodeCmd(args) {
        this.writeCmd(args);
        return this.writer.flush();
    }
    writeCmd(args) {
        const length = args.length;
        this.writeArrHdr(length);
        for (let i = 0; i < length; i++) {
            const arg = args[i];
            if (arg instanceof Uint8Array)
                this.writeBin(arg);
            else
                this.writeBulkStrAscii(arg + '');
        }
    }
    encodeCmdUtf8(args) {
        this.writeCmdUtf8(args);
        return this.writer.flush();
    }
    writeCmdUtf8(args) {
        const length = args.length;
        this.writeArrHdr(length);
        for (let i = 0; i < length; i++)
            this.writeArgUtf8(args[i]);
    }
    writeArgUtf8(arg) {
        if (arg instanceof Uint8Array)
            return this.writeBin(arg);
        else
            this.writeBulkStr(arg + '');
    }
    writeNull() {
        this.writer.u8u16(95, 3338);
    }
    writeNullStr() {
        this.writer.u8u32(36, 45 * 0x1000000 +
            49 * 0x10000 +
            3338);
    }
    writeNullArr() {
        this.writer.u8u32(42, 45 * 0x1000000 +
            49 * 0x10000 +
            3338);
    }
    writeBoolean(bool) {
        this.writer.u32(bool
            ? 35 * 0x1000000 +
                116 * 0x10000 +
                3338
            : 35 * 0x1000000 +
                102 * 0x10000 +
                3338);
    }
    writeNumber(num) {
        if (isSafeInteger(num))
            this.writeInteger(num);
        else if (typeof num === 'bigint')
            this.writeBigInt(num);
        else
            this.writeFloat(num);
    }
    writeBigInt(int) {
        const writer = this.writer;
        writer.u8(40);
        writer.ascii(int + '');
        writer.u16(3338);
    }
    writeInteger(int) {
        const writer = this.writer;
        writer.u8(58);
        writer.ascii(int + '');
        writer.u16(3338);
    }
    writeUInteger(uint) {
        this.writeInteger(uint);
    }
    writeFloat(float) {
        const writer = this.writer;
        writer.u8(44);
        switch (float) {
            case Infinity:
                writer.u8u16(105, (110 << 8) |
                    102);
                break;
            case -Infinity:
                writer.u32((45 * 0x1000000 +
                    105 * 0x10000 +
                    (110 << 8)) |
                    102);
                break;
            default:
                if (float !== float)
                    writer.u8u16(110, (97 << 8) |
                        110);
                else
                    writer.ascii(float + '');
                break;
        }
        writer.u16(3338);
    }
    writeBin(buf) {
        const writer = this.writer;
        const length = buf.length;
        writer.u8(36);
        this.writeLength(length);
        writer.u16(3338);
        writer.buf(buf, length);
        writer.u16(3338);
    }
    writeBinHdr(length) {
        throw new Error('Not implemented');
    }
    writeStr(str) {
        const length = str.length;
        if (length < 64 && !REG_RN.test(str))
            this.writeSimpleStr(str);
        else
            this.writeVerbatimStr('txt', str);
    }
    writeStrHdr(length) {
        throw new Error('Not implemented');
    }
    writeSimpleStr(str) {
        const writer = this.writer;
        writer.u8(43);
        writer.ensureCapacity(str.length << 2);
        writer.utf8(str);
        writer.u16(3338);
    }
    writeSimpleStrAscii(str) {
        const writer = this.writer;
        writer.u8(43);
        writer.ascii(str);
        writer.u16(3338);
    }
    writeBulkStr(str) {
        const writer = this.writer;
        const size = (0, utf8_1.utf8Size)(str);
        writer.u8(36);
        this.writeLength(size);
        writer.u16(3338);
        writer.ensureCapacity(size);
        writer.utf8(str);
        writer.u16(3338);
    }
    writeBulkStrAscii(str) {
        const writer = this.writer;
        writer.u8(36);
        this.writeLength(str.length);
        writer.u16(3338);
        writer.ascii(str);
        writer.u16(3338);
    }
    writeAsciiStr(str) {
        const isSimple = !REG_RN.test(str);
        if (isSimple)
            this.writeSimpleStr(str);
        else
            this.writeBulkStrAscii(str);
    }
    writeVerbatimStr(encoding, str) {
        const writer = this.writer;
        const size = (0, utf8_1.utf8Size)(str);
        writer.u8(61);
        this.writeLength(size + 4);
        writer.u16(3338);
        writer.u32(encoding.charCodeAt(0) * 0x1000000 +
            (encoding.charCodeAt(1) << 16) +
            (encoding.charCodeAt(2) << 8) +
            58);
        writer.ensureCapacity(size);
        writer.utf8(str);
        writer.u16(3338);
    }
    writeErr(str) {
        if (str.length < 64 && !REG_RN.test(str))
            this.writeSimpleErr(str);
        else
            this.writeBulkErr(str);
    }
    writeSimpleErr(str) {
        const writer = this.writer;
        writer.u8(45);
        writer.ensureCapacity(str.length << 2);
        writer.utf8(str);
        writer.u16(3338);
    }
    writeBulkErr(str) {
        const writer = this.writer;
        const size = (0, utf8_1.utf8Size)(str);
        writer.u8(33);
        this.writeLength(size);
        writer.u16(3338);
        writer.ensureCapacity(size);
        writer.utf8(str);
        writer.u16(3338);
    }
    writeArr(arr) {
        const writer = this.writer;
        const length = arr.length;
        writer.u8(42);
        this.writeLength(length);
        writer.u16(3338);
        for (let i = 0; i < length; i++)
            this.writeAny(arr[i]);
    }
    writeArrHdr(length) {
        const writer = this.writer;
        writer.u8(42);
        this.writeLength(length);
        writer.u16(3338);
    }
    writeObj(obj) {
        const writer = this.writer;
        const keys = Object.keys(obj);
        const length = keys.length;
        writer.u8(37);
        this.writeLength(length);
        writer.u16(3338);
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            this.writeStr(key);
            this.writeAny(obj[key]);
        }
    }
    writeObjHdr(length) {
        const writer = this.writer;
        writer.u8(37);
        this.writeLength(length);
        writer.u16(3338);
    }
    writeAttr(obj) {
        const writer = this.writer;
        const keys = Object.keys(obj);
        const length = keys.length;
        writer.u8(124);
        this.writeLength(length);
        writer.u16(3338);
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            this.writeStr(key);
            this.writeAny(obj[key]);
        }
    }
    writeSet(set) {
        const writer = this.writer;
        const length = set.size;
        writer.u8(126);
        this.writeLength(length);
        writer.u16(3338);
        for (let i = 0; i < length; i++)
            set.forEach((value) => this.writeAny(value));
    }
    writePush(elements) {
        const writer = this.writer;
        const length = elements.length;
        writer.u8(62);
        this.writeLength(length);
        writer.u16(3338);
        for (let i = 0; i < length; i++)
            this.writeAny(elements[i]);
    }
    writeUnknown(value) {
        this.writeNull();
    }
    writeUndef() {
        this.writeNull();
    }
    writeRn() {
        this.writer.u16(3338);
    }
    writeStartStr() {
        this.writer.u32(36 * 0x1000000 +
            (63 << 16) +
            3338);
    }
    writeStrChunk(str) {
        const writer = this.writer;
        writer.u8(59);
        const size = (0, utf8_1.utf8Size)(str);
        this.writeLength(size);
        writer.u16(3338);
        writer.ensureCapacity(size);
        writer.utf8(str);
        writer.u16(3338);
    }
    writeEndStr() {
        this.writer.u32(59 * 0x1000000 +
            (48 << 16) +
            3338);
    }
    writeStartBin() {
        this.writer.u32(36 * 0x1000000 +
            (63 << 16) +
            3338);
    }
    writeBinChunk(buf) {
        const writer = this.writer;
        const length = buf.length;
        writer.u8(59);
        this.writeLength(length);
        writer.u16(3338);
        writer.buf(buf, length);
        writer.u16(3338);
    }
    writeEndBin() {
        this.writer.u32(59 * 0x1000000 +
            (48 << 16) +
            3338);
    }
    writeStartArr() {
        this.writer.u32(42 * 0x1000000 +
            (63 << 16) +
            3338);
    }
    writeArrChunk(item) {
        this.writeAny(item);
    }
    writeEndArr() {
        this.writer.u8u16(46, 3338);
    }
    writeStartObj() {
        this.writer.u32(37 * 0x1000000 +
            (63 << 16) +
            3338);
    }
    writeObjChunk(key, value) {
        this.writeStr(key);
        this.writeAny(value);
    }
    writeEndObj() {
        this.writer.u8u16(46, 3338);
    }
}
exports.RespEncoder = RespEncoder;
//# sourceMappingURL=RespEncoder.js.map