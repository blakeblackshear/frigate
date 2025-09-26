"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Writer = void 0;
const Slice_1 = require("./Slice");
const EMPTY_UINT8 = new Uint8Array([]);
const EMPTY_VIEW = new DataView(EMPTY_UINT8.buffer);
const hasBuffer = typeof Buffer === 'function';
const utf8Write = hasBuffer
    ? Buffer.prototype.utf8Write
    : null;
const from = hasBuffer ? Buffer.from : null;
const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
class Writer {
    constructor(allocSize = 64 * 1024) {
        this.allocSize = allocSize;
        this.view = EMPTY_VIEW;
        this.x0 = 0;
        this.x = 0;
        this.uint8 = new Uint8Array(allocSize);
        this.size = allocSize;
        this.view = new DataView(this.uint8.buffer);
    }
    grow(size) {
        const x0 = this.x0;
        const x = this.x;
        const oldUint8 = this.uint8;
        const newUint8 = new Uint8Array(size);
        const view = new DataView(newUint8.buffer);
        const activeSlice = oldUint8.subarray(x0, x);
        newUint8.set(activeSlice, 0);
        this.x = x - x0;
        this.x0 = 0;
        this.uint8 = newUint8;
        this.size = size;
        this.view = view;
    }
    ensureCapacity(capacity) {
        const byteLength = this.size;
        const remaining = byteLength - this.x;
        if (remaining < capacity) {
            const total = byteLength - this.x0;
            const required = capacity - remaining;
            const totalRequired = total + required;
            this.grow(totalRequired <= this.allocSize ? this.allocSize : totalRequired * 2);
        }
    }
    move(capacity) {
        this.ensureCapacity(capacity);
        this.x += capacity;
    }
    reset() {
        this.x0 = this.x;
    }
    newBuffer(size) {
        const uint8 = (this.uint8 = new Uint8Array(size));
        this.size = size;
        this.view = new DataView(uint8.buffer);
        this.x = this.x0 = 0;
    }
    flush() {
        const result = this.uint8.subarray(this.x0, this.x);
        this.x0 = this.x;
        return result;
    }
    flushSlice() {
        const slice = new Slice_1.Slice(this.uint8, this.view, this.x0, this.x);
        this.x0 = this.x;
        return slice;
    }
    u8(char) {
        this.ensureCapacity(1);
        this.uint8[this.x++] = char;
    }
    u16(word) {
        this.ensureCapacity(2);
        this.view.setUint16(this.x, word);
        this.x += 2;
    }
    u32(dword) {
        this.ensureCapacity(4);
        this.view.setUint32(this.x, dword);
        this.x += 4;
    }
    i32(dword) {
        this.ensureCapacity(4);
        this.view.setInt32(this.x, dword);
        this.x += 4;
    }
    u64(qword) {
        this.ensureCapacity(8);
        this.view.setBigUint64(this.x, BigInt(qword));
        this.x += 8;
    }
    f64(float) {
        this.ensureCapacity(8);
        this.view.setFloat64(this.x, float);
        this.x += 8;
    }
    u8u16(u8, u16) {
        this.ensureCapacity(3);
        let x = this.x;
        this.uint8[x++] = u8;
        this.uint8[x++] = u16 >>> 8;
        this.uint8[x++] = u16 & 0xff;
        this.x = x;
    }
    u8u32(u8, u32) {
        this.ensureCapacity(5);
        let x = this.x;
        this.uint8[x++] = u8;
        this.view.setUint32(x, u32);
        this.x = x + 4;
    }
    u8u64(u8, u64) {
        this.ensureCapacity(9);
        let x = this.x;
        this.uint8[x++] = u8;
        this.view.setBigUint64(x, BigInt(u64));
        this.x = x + 8;
    }
    u8f32(u8, f32) {
        this.ensureCapacity(5);
        let x = this.x;
        this.uint8[x++] = u8;
        this.view.setFloat32(x, f32);
        this.x = x + 4;
    }
    u8f64(u8, f64) {
        this.ensureCapacity(9);
        let x = this.x;
        this.uint8[x++] = u8;
        this.view.setFloat64(x, f64);
        this.x = x + 8;
    }
    buf(buf, length) {
        this.ensureCapacity(length);
        const x = this.x;
        this.uint8.set(buf, x);
        this.x = x + length;
    }
    utf8(str) {
        const maxLength = str.length * 4;
        if (maxLength < 168)
            return this.utf8Native(str);
        if (utf8Write) {
            const writeLength = utf8Write.call(this.uint8, str, this.x, maxLength);
            this.x += writeLength;
            return writeLength;
        }
        else if (from) {
            const uint8 = this.uint8;
            const offset = uint8.byteOffset + this.x;
            const buf = from(uint8.buffer).subarray(offset, offset + maxLength);
            const writeLength = buf.write(str, 0, maxLength, 'utf8');
            this.x += writeLength;
            return writeLength;
        }
        else if (maxLength > 1024 && textEncoder) {
            const writeLength = textEncoder.encodeInto(str, this.uint8.subarray(this.x, this.x + maxLength)).written;
            this.x += writeLength;
            return writeLength;
        }
        return this.utf8Native(str);
    }
    utf8Native(str) {
        const length = str.length;
        const uint8 = this.uint8;
        let offset = this.x;
        let pos = 0;
        while (pos < length) {
            let value = str.charCodeAt(pos++);
            if ((value & 0xffffff80) === 0) {
                uint8[offset++] = value;
                continue;
            }
            else if ((value & 0xfffff800) === 0) {
                uint8[offset++] = ((value >> 6) & 0x1f) | 0xc0;
            }
            else {
                if (value >= 0xd800 && value <= 0xdbff) {
                    if (pos < length) {
                        const extra = str.charCodeAt(pos);
                        if ((extra & 0xfc00) === 0xdc00) {
                            pos++;
                            value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
                        }
                    }
                }
                if ((value & 0xffff0000) === 0) {
                    uint8[offset++] = ((value >> 12) & 0x0f) | 0xe0;
                    uint8[offset++] = ((value >> 6) & 0x3f) | 0x80;
                }
                else {
                    uint8[offset++] = ((value >> 18) & 0x07) | 0xf0;
                    uint8[offset++] = ((value >> 12) & 0x3f) | 0x80;
                    uint8[offset++] = ((value >> 6) & 0x3f) | 0x80;
                }
            }
            uint8[offset++] = (value & 0x3f) | 0x80;
        }
        const writeLength = offset - this.x;
        this.x = offset;
        return writeLength;
    }
    ascii(str) {
        const length = str.length;
        this.ensureCapacity(length);
        const uint8 = this.uint8;
        let x = this.x;
        let pos = 0;
        while (pos < length)
            uint8[x++] = str.charCodeAt(pos++);
        this.x = x;
    }
}
exports.Writer = Writer;
//# sourceMappingURL=Writer.js.map