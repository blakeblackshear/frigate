"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XdrEncoder = void 0;
class XdrEncoder {
    constructor(writer) {
        this.writer = writer;
    }
    encode(value) {
        const writer = this.writer;
        writer.reset();
        this.writeAny(value);
        return writer.flush();
    }
    writeUnknown(value) {
        this.writeVoid();
    }
    writeAny(value) {
        switch (typeof value) {
            case 'boolean':
                return this.writeBoolean(value);
            case 'number':
                return this.writeNumber(value);
            case 'string':
                return this.writeStr(value);
            case 'object': {
                if (value === null)
                    return this.writeVoid();
                const constructor = value.constructor;
                switch (constructor) {
                    case Uint8Array:
                        return this.writeBin(value);
                    default:
                        return this.writeUnknown(value);
                }
            }
            case 'bigint':
                return this.writeHyper(value);
            case 'undefined':
                return this.writeVoid();
            default:
                return this.writeUnknown(value);
        }
    }
    writeVoid() {
    }
    writeNull() {
        this.writeVoid();
    }
    writeBoolean(bool) {
        this.writeInt(bool ? 1 : 0);
    }
    writeInt(int) {
        const writer = this.writer;
        writer.ensureCapacity(4);
        writer.view.setInt32(writer.x, Math.trunc(int), false);
        writer.move(4);
    }
    writeUnsignedInt(uint) {
        const writer = this.writer;
        writer.ensureCapacity(4);
        writer.view.setUint32(writer.x, Math.trunc(uint) >>> 0, false);
        writer.move(4);
    }
    writeHyper(hyper) {
        const writer = this.writer;
        writer.ensureCapacity(8);
        if (typeof hyper === 'bigint') {
            writer.view.setBigInt64(writer.x, hyper, false);
        }
        else {
            const truncated = Math.trunc(hyper);
            const high = Math.floor(truncated / 0x100000000);
            const low = truncated >>> 0;
            writer.view.setInt32(writer.x, high, false);
            writer.view.setUint32(writer.x + 4, low, false);
        }
        writer.move(8);
    }
    writeUnsignedHyper(uhyper) {
        const writer = this.writer;
        writer.ensureCapacity(8);
        if (typeof uhyper === 'bigint') {
            writer.view.setBigUint64(writer.x, uhyper, false);
        }
        else {
            const truncated = Math.trunc(Math.abs(uhyper));
            const high = Math.floor(truncated / 0x100000000);
            const low = truncated >>> 0;
            writer.view.setUint32(writer.x, high, false);
            writer.view.setUint32(writer.x + 4, low, false);
        }
        writer.move(8);
    }
    writeFloat(float) {
        const writer = this.writer;
        writer.ensureCapacity(4);
        writer.view.setFloat32(writer.x, float, false);
        writer.move(4);
    }
    writeDouble(double) {
        const writer = this.writer;
        writer.ensureCapacity(8);
        writer.view.setFloat64(writer.x, double, false);
        writer.move(8);
    }
    writeQuadruple(quad) {
        throw new Error('not implemented');
    }
    writeOpaque(data) {
        const size = data.length;
        const writer = this.writer;
        const paddedSize = Math.ceil(size / 4) * 4;
        writer.ensureCapacity(paddedSize);
        writer.buf(data, size);
        const padding = paddedSize - size;
        for (let i = 0; i < padding; i++) {
            writer.u8(0);
        }
    }
    writeVarlenOpaque(data) {
        this.writeUnsignedInt(data.length);
        this.writeOpaque(data);
    }
    writeStr(str) {
        const writer = this.writer;
        const lengthOffset = writer.x;
        writer.x += 4;
        const bytesWritten = writer.utf8(str);
        const paddedSize = Math.ceil(bytesWritten / 4) * 4;
        const padding = paddedSize - bytesWritten;
        for (let i = 0; i < padding; i++) {
            writer.u8(0);
        }
        const currentPos = writer.x;
        writer.x = lengthOffset;
        this.writeUnsignedInt(bytesWritten);
        writer.x = currentPos;
    }
    writeArr(arr) {
        throw new Error('not implemented');
    }
    writeObj(obj) {
        throw new Error('not implemented');
    }
    writeNumber(num) {
        if (Number.isInteger(num)) {
            if (num >= -2147483648 && num <= 2147483647) {
                this.writeInt(num);
            }
            else {
                this.writeHyper(num);
            }
        }
        else {
            this.writeDouble(num);
        }
    }
    writeInteger(int) {
        this.writeInt(int);
    }
    writeUInteger(uint) {
        this.writeUnsignedInt(uint);
    }
    writeBin(buf) {
        this.writeVarlenOpaque(buf);
    }
    writeAsciiStr(str) {
        this.writeStr(str);
    }
}
exports.XdrEncoder = XdrEncoder;
//# sourceMappingURL=XdrEncoder.js.map