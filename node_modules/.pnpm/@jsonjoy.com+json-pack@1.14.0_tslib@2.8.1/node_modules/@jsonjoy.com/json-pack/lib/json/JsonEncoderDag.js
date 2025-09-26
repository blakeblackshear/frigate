"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonEncoderDag = void 0;
const JsonEncoderStable_1 = require("./JsonEncoderStable");
const createToBase64Bin_1 = require("@jsonjoy.com/base64/lib/createToBase64Bin");
const objBaseLength = '{"/":{"bytes":""}}'.length;
const cidBaseLength = '{"/":""}'.length;
const base64Encode = (0, createToBase64Bin_1.createToBase64Bin)(undefined, '');
class JsonEncoderDag extends JsonEncoderStable_1.JsonEncoderStable {
    writeBin(buf) {
        const writer = this.writer;
        const length = buf.length;
        writer.ensureCapacity(objBaseLength + (length << 1));
        const view = writer.view;
        const uint8 = writer.uint8;
        let x = writer.x;
        view.setUint32(x, 0x7b222f22);
        x += 4;
        view.setUint32(x, 0x3a7b2262);
        x += 4;
        view.setUint32(x, 0x79746573);
        x += 4;
        view.setUint16(x, 0x223a);
        x += 2;
        uint8[x] = 0x22;
        x += 1;
        x = base64Encode(buf, 0, length, view, x);
        view.setUint16(x, 0x227d);
        x += 2;
        uint8[x] = 0x7d;
        x += 1;
        writer.x = x;
    }
    writeCid(cid) {
        const writer = this.writer;
        writer.ensureCapacity(cidBaseLength + cid.length);
        writer.u32(0x7b222f22);
        writer.u16(0x3a22);
        writer.ascii(cid);
        writer.u16(0x227d);
    }
}
exports.JsonEncoderDag = JsonEncoderDag;
//# sourceMappingURL=JsonEncoderDag.js.map