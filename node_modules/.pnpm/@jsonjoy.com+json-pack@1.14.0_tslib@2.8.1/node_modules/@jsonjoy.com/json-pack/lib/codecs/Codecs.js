"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Codecs = void 0;
const cbor_1 = require("./cbor");
const json_1 = require("./json");
const msgpack_1 = require("./msgpack");
class Codecs {
    constructor(writer) {
        this.writer = writer;
        this.cbor = new cbor_1.CborJsonValueCodec(this.writer);
        this.msgpack = new msgpack_1.MsgPackJsonValueCodec(this.writer);
        this.json = new json_1.JsonJsonValueCodec(this.writer);
    }
}
exports.Codecs = Codecs;
//# sourceMappingURL=Codecs.js.map