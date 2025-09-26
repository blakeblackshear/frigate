"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CborJsonValueCodec = void 0;
const CborDecoder_1 = require("../cbor/CborDecoder");
const CborEncoder_1 = require("../cbor/CborEncoder");
class CborJsonValueCodec {
    constructor(writer) {
        this.id = 'cbor';
        this.format = 0;
        this.encoder = new CborEncoder_1.CborEncoder(writer);
        this.decoder = new CborDecoder_1.CborDecoder();
    }
}
exports.CborJsonValueCodec = CborJsonValueCodec;
//# sourceMappingURL=cbor.js.map