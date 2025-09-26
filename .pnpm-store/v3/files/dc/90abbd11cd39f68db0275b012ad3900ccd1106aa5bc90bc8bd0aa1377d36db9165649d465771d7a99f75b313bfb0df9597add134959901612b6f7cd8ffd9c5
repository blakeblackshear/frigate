"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonEncoderStable = void 0;
const JsonEncoder_1 = require("./JsonEncoder");
const insertion2_1 = require("@jsonjoy.com/util/lib/sort/insertion2");
const objKeyCmp_1 = require("@jsonjoy.com/util/lib/objKeyCmp");
class JsonEncoderStable extends JsonEncoder_1.JsonEncoder {
    writeObj(obj) {
        const writer = this.writer;
        const keys = Object.keys(obj);
        (0, insertion2_1.sort)(keys, objKeyCmp_1.objKeyCmp);
        const length = keys.length;
        if (!length)
            return writer.u16(0x7b7d);
        writer.u8(0x7b);
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            const value = obj[key];
            this.writeStr(key);
            writer.u8(0x3a);
            this.writeAny(value);
            writer.u8(0x2c);
        }
        writer.uint8[writer.x - 1] = 0x7d;
    }
}
exports.JsonEncoderStable = JsonEncoderStable;
//# sourceMappingURL=JsonEncoderStable.js.map