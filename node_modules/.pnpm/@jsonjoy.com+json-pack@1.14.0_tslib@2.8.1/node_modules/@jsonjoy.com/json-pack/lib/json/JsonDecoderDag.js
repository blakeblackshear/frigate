"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonDecoderDag = exports.fromBase64Bin = void 0;
const JsonDecoder_1 = require("./JsonDecoder");
const util_1 = require("./util");
const createFromBase64Bin_1 = require("@jsonjoy.com/base64/lib/createFromBase64Bin");
exports.fromBase64Bin = (0, createFromBase64Bin_1.createFromBase64Bin)(undefined, '');
class JsonDecoderDag extends JsonDecoder_1.JsonDecoder {
    readObj() {
        const bytes = this.tryReadBytes();
        if (bytes)
            return bytes;
        const cid = this.tryReadCid();
        if (cid)
            return cid;
        return super.readObj();
    }
    tryReadBytes() {
        const reader = this.reader;
        const x = reader.x;
        if (reader.u8() !== 0x7b) {
            reader.x = x;
            return;
        }
        this.skipWhitespace();
        if (reader.u8() !== 0x22 || reader.u8() !== 0x2f || reader.u8() !== 0x22) {
            reader.x = x;
            return;
        }
        this.skipWhitespace();
        if (reader.u8() !== 0x3a) {
            reader.x = x;
            return;
        }
        this.skipWhitespace();
        if (reader.u8() !== 0x7b) {
            reader.x = x;
            return;
        }
        this.skipWhitespace();
        if (reader.u8() !== 0x22 ||
            reader.u8() !== 0x62 ||
            reader.u8() !== 0x79 ||
            reader.u8() !== 0x74 ||
            reader.u8() !== 0x65 ||
            reader.u8() !== 0x73 ||
            reader.u8() !== 0x22) {
            reader.x = x;
            return;
        }
        this.skipWhitespace();
        if (reader.u8() !== 0x3a) {
            reader.x = x;
            return;
        }
        this.skipWhitespace();
        if (reader.u8() !== 0x22) {
            reader.x = x;
            return;
        }
        const bufStart = reader.x;
        const bufEnd = (0, util_1.findEndingQuote)(reader.uint8, bufStart);
        reader.x = 1 + bufEnd;
        this.skipWhitespace();
        if (reader.u8() !== 0x7d) {
            reader.x = x;
            return;
        }
        this.skipWhitespace();
        if (reader.u8() !== 0x7d) {
            reader.x = x;
            return;
        }
        const bin = (0, exports.fromBase64Bin)(reader.view, bufStart, bufEnd - bufStart);
        return bin;
    }
    tryReadCid() {
        const reader = this.reader;
        const x = reader.x;
        if (reader.u8() !== 0x7b) {
            reader.x = x;
            return;
        }
        this.skipWhitespace();
        if (reader.u8() !== 0x22 || reader.u8() !== 0x2f || reader.u8() !== 0x22) {
            reader.x = x;
            return;
        }
        this.skipWhitespace();
        if (reader.u8() !== 0x3a) {
            reader.x = x;
            return;
        }
        this.skipWhitespace();
        if (reader.u8() !== 0x22) {
            reader.x = x;
            return;
        }
        const bufStart = reader.x;
        const bufEnd = (0, util_1.findEndingQuote)(reader.uint8, bufStart);
        reader.x = 1 + bufEnd;
        this.skipWhitespace();
        if (reader.u8() !== 0x7d) {
            reader.x = x;
            return;
        }
        const finalX = reader.x;
        reader.x = bufStart;
        const cid = reader.ascii(bufEnd - bufStart);
        reader.x = finalX;
        return this.readCid(cid);
    }
    readCid(cid) {
        return cid;
    }
}
exports.JsonDecoderDag = JsonDecoderDag;
//# sourceMappingURL=JsonDecoderDag.js.map