"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IonEncoderFast = void 0;
const Writer_1 = require("@jsonjoy.com/buffers/lib/Writer");
const ast_1 = require("./ast");
const Import_1 = require("./Import");
const symbols_1 = require("./symbols");
class IonEncoderFast {
    constructor(writer = new Writer_1.Writer()) {
        this.writer = writer;
    }
    encode(value) {
        this.writer.reset();
        this.symbols = new Import_1.Import(symbols_1.systemSymbolImport, []);
        const ast = (0, ast_1.toAst)(value, this.symbols);
        this.writeIvm();
        this.writeSymbolTable();
        this.writeAny(ast);
        return this.writer.flush();
    }
    writeAny(value) {
        if (value instanceof ast_1.NullAstNode)
            this.writer.u8(0 + 15);
        else if (value instanceof ast_1.StrAstNode)
            this.writeStr(value);
        else if (value instanceof ast_1.UintAstNode)
            this.encodeUint(value);
        else if (value instanceof ast_1.NintAstNode)
            this.encodeNint(value);
        else if (value instanceof ast_1.ObjAstNode)
            this.writeObj(value);
        else if (value instanceof ast_1.ArrAstNode)
            this.writeArr(value);
        else if (value instanceof ast_1.FloatAstNode)
            this.writeFloat(value);
        else if (value instanceof ast_1.BoolAstNode)
            this.writeBool(value);
        else if (value instanceof ast_1.BinAstNode)
            this.writeBin(value);
    }
    writeIvm() {
        this.writer.u32(0xe00100ea);
    }
    writeSymbolTable() {
        if (!this.symbols?.length)
            return;
        const node = new ast_1.AnnotationAstNode(this.symbols.toAst(), [3]);
        this.writeAnnotations(node);
    }
    writeAnnotations(node) {
        const writer = this.writer;
        if (node.len < 14)
            writer.u8(224 + node.len);
        else {
            writer.u8(224 + 14);
            this.writeVUint(node.len);
        }
        this.writeVUint(node.annotationLen);
        for (let i = 0; i < node.annotations.length; i++)
            this.writeVUint(node.annotations[i]);
        this.writeAny(node.val);
    }
    writeBool(node) {
        this.writer.u8(16 + (node.val ? 1 : 0));
    }
    encodeUint(node) {
        const uint = node.val;
        if (!uint)
            this.writer.u8(32);
        else if (uint <= 0xff)
            this.writer.u16(((32 + 1) << 8) + uint);
        else if (uint <= 0xffff)
            this.writer.u8u16(32 + 2, uint);
        else if (uint <= 0xffffff)
            this.writer.u32(((32 + 3) << 24) + uint);
        else if (uint <= 0xffffffff)
            this.writer.u8u32(32 + 4, uint);
        else {
            let lo = uint | 0;
            if (lo < 0)
                lo += 4294967296;
            let hi = uint - lo;
            hi /= 4294967296;
            if (uint <= 0xffffffffff) {
                this.writer.u16(((32 + 5) << 8) + hi);
                this.writer.u32(lo);
            }
            else if (uint <= 0xffffffffffff) {
                this.writer.u8u16(32 + 6, hi);
                this.writer.u32(lo);
            }
            else {
                this.writer.u16(((32 + 7) << 8) + (hi >> 16));
                this.writer.u16(hi & 0xffff);
                this.writer.u32(lo);
            }
        }
    }
    encodeNint(node) {
        const uint = -node.val;
        if (uint <= 0xff)
            this.writer.u16(((48 + 1) << 8) + uint);
        else if (uint <= 0xffff)
            this.writer.u8u16(48 + 2, uint);
        else if (uint <= 0xffffff)
            this.writer.u32(((48 + 3) << 24) + uint);
        else if (uint <= 0xffffffff)
            this.writer.u8u32(48 + 4, uint);
        else {
            let lo = uint | 0;
            if (lo < 0)
                lo += 4294967296;
            let hi = uint - lo;
            hi /= 4294967296;
            if (uint <= 0xffffffffff) {
                this.writer.u16(((48 + 5) << 8) + hi);
                this.writer.u32(lo);
            }
            else if (uint <= 0xffffffffffff) {
                this.writer.u8u16(48 + 6, hi);
                this.writer.u32(lo);
            }
            else {
                this.writer.u16(((48 + 7) << 8) + (hi >> 16));
                this.writer.u16(hi & 0xffff);
                this.writer.u32(lo);
            }
        }
    }
    writeFloat(node) {
        this.writer.u8f64(64 + 8, node.val);
    }
    writeVUint(num) {
        const writer = this.writer;
        if (num <= 0b1111111) {
            writer.u8(0b10000000 + num);
        }
        else if (num <= 16383) {
            writer.ensureCapacity(2);
            const uint8 = writer.uint8;
            uint8[writer.x++] = num >>> 7;
            uint8[writer.x++] = 0b10000000 + (num & 0b01111111);
        }
        else if (num <= 2097151) {
            writer.ensureCapacity(3);
            const uint8 = writer.uint8;
            uint8[writer.x++] = num >>> 14;
            uint8[writer.x++] = (num >>> 7) & 0b01111111;
            uint8[writer.x++] = 0b10000000 + (num & 0b01111111);
        }
        else if (num <= 268435455) {
            writer.ensureCapacity(4);
            const uint8 = writer.uint8;
            uint8[writer.x++] = num >>> 21;
            uint8[writer.x++] = (num >>> 14) & 0b01111111;
            uint8[writer.x++] = (num >>> 7) & 0b01111111;
            uint8[writer.x++] = 0b10000000 + (num & 0b01111111);
        }
        else {
            let lo32 = num | 0;
            if (lo32 < 0)
                lo32 += 4294967296;
            const hi32 = (num - lo32) / 4294967296;
            if (num <= 34359738367) {
                writer.ensureCapacity(5);
                const uint8 = writer.uint8;
                uint8[writer.x++] = (hi32 << 4) | (num >>> 28);
                uint8[writer.x++] = (num >>> 21) & 0b01111111;
                uint8[writer.x++] = (num >>> 14) & 0b01111111;
                uint8[writer.x++] = (num >>> 7) & 0b01111111;
                uint8[writer.x++] = 0b10000000 + (num & 0b01111111);
            }
            else if (num <= 4398046511103) {
                writer.ensureCapacity(6);
                const uint8 = writer.uint8;
                uint8[writer.x++] = (hi32 >>> 3) & 0b1111;
                uint8[writer.x++] = ((hi32 & 0b111) << 4) | (num >>> 28);
                uint8[writer.x++] = (num >>> 21) & 0b01111111;
                uint8[writer.x++] = (num >>> 14) & 0b01111111;
                uint8[writer.x++] = (num >>> 7) & 0b01111111;
                uint8[writer.x++] = 0b10000000 + (num & 0b01111111);
            }
        }
    }
    writeStr(node) {
        const str = node.val;
        const length = node.len;
        const writer = this.writer;
        if (length < 14)
            writer.u8(128 + length);
        else {
            writer.u8(128 + 14);
            this.writeVUint(length);
        }
        writer.ensureCapacity(length * 4);
        writer.utf8(str);
    }
    writeBin(node) {
        const buf = node.val;
        const length = node.len;
        const writer = this.writer;
        if (length < 14)
            writer.u8(160 + length);
        else {
            writer.u8(160 + 14);
            this.writeVUint(length);
        }
        writer.buf(buf, length);
    }
    writeArr(node) {
        const writer = this.writer;
        const arr = node.val;
        if (arr === null) {
            writer.u8(176 + 15);
            return;
        }
        const length = node.len;
        if (length < 14)
            writer.u8(176 + length);
        else {
            writer.u8(176 + 14);
            this.writeVUint(length);
        }
        for (let i = 0; i < length; i++)
            this.writeAny(arr[i]);
    }
    writeObj(node) {
        const writer = this.writer;
        const arr = node.val;
        if (arr === null) {
            writer.u8(176 + 15);
            return;
        }
        const length = node.len;
        if (length < 14)
            writer.u8(208 + length);
        else {
            writer.u8(208 + 14);
            this.writeVUint(length);
        }
        node.val.forEach((n, symbolId) => {
            this.writeVUint(symbolId);
            this.writeAny(n);
        });
    }
}
exports.IonEncoderFast = IonEncoderFast;
//# sourceMappingURL=IonEncoderFast.js.map