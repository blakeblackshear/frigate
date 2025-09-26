"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgPackEncoderStable = void 0;
const insertion_1 = require("@jsonjoy.com/util/lib/sort/insertion");
const MsgPackEncoderFast_1 = require("./MsgPackEncoderFast");
class MsgPackEncoderStable extends MsgPackEncoderFast_1.MsgPackEncoderFast {
    writeObj(obj) {
        const keys = (0, insertion_1.sort)(Object.keys(obj));
        const length = keys.length;
        this.writeObjHdr(length);
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            this.writeStr(key);
            this.writeAny(obj[key]);
        }
    }
}
exports.MsgPackEncoderStable = MsgPackEncoderStable;
//# sourceMappingURL=MsgPackEncoderStable.js.map