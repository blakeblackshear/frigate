"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CborEncoderDag = void 0;
const CborEncoderStable_1 = require("./CborEncoderStable");
class CborEncoderDag extends CborEncoderStable_1.CborEncoderStable {
    writeUndef() {
        this.writeNull();
    }
    writeFloat(float) {
        if (float !== float)
            return this.writeNull();
        if (!Number.isFinite(float))
            return this.writeNull();
        this.writer.u8f64(0xfb, float);
    }
    writeTag(tag, value) {
        if (tag === 42)
            this.writeTagHdr(tag);
        this.writeAny(value);
    }
}
exports.CborEncoderDag = CborEncoderDag;
//# sourceMappingURL=CborEncoderDag.js.map