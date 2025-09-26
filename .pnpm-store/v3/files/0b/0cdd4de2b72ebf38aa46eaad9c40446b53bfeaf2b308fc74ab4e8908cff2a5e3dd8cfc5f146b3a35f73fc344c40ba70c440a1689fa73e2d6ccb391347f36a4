"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CborEncoderStable = void 0;
const CborEncoder_1 = require("./CborEncoder");
const insertion2_1 = require("@jsonjoy.com/util/lib/sort/insertion2");
const objKeyCmp_1 = require("@jsonjoy.com/util/lib/objKeyCmp");
const strHeaderLength = (strSize) => {
    if (strSize <= 23)
        return 1;
    else if (strSize <= 0xff)
        return 2;
    else if (strSize <= 0xffff)
        return 3;
    else
        return 5;
};
class CborEncoderStable extends CborEncoder_1.CborEncoder {
    writeObj(obj) {
        const keys = Object.keys(obj);
        (0, insertion2_1.sort)(keys, objKeyCmp_1.objKeyCmp);
        const length = keys.length;
        this.writeObjHdr(length);
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            this.writeStr(key);
            this.writeAny(obj[key]);
        }
    }
    writeStr(str) {
        const writer = this.writer;
        const length = str.length;
        const maxSize = length * 4;
        writer.ensureCapacity(5 + maxSize);
        const headerLengthGuess = strHeaderLength(length);
        const x0 = writer.x;
        const x1 = x0 + headerLengthGuess;
        writer.x = x1;
        const bytesWritten = writer.utf8(str);
        const uint8 = writer.uint8;
        const headerLength = strHeaderLength(bytesWritten);
        if (headerLength !== headerLengthGuess) {
            const shift = headerLength - headerLengthGuess;
            uint8.copyWithin(x1 + shift, x1, x1 + bytesWritten);
        }
        switch (headerLength) {
            case 1:
                uint8[x0] = 96 + bytesWritten;
                break;
            case 2:
                uint8[x0] = 0x78;
                uint8[x0 + 1] = bytesWritten;
                break;
            case 3: {
                uint8[x0] = 0x79;
                writer.view.setUint16(x0 + 1, bytesWritten);
                break;
            }
            case 5: {
                uint8[x0] = 0x7a;
                writer.view.setUint32(x0 + 1, bytesWritten);
                break;
            }
        }
        writer.x = x0 + headerLength + bytesWritten;
    }
    writeUndef() {
        this.writeNull();
    }
}
exports.CborEncoderStable = CborEncoderStable;
//# sourceMappingURL=CborEncoderStable.js.map