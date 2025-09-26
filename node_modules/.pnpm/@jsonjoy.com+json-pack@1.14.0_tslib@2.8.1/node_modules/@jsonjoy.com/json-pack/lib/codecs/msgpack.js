"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MsgPackJsonValueCodec = void 0;
const msgpack_1 = require("../msgpack");
const MsgPackDecoder_1 = require("../msgpack/MsgPackDecoder");
class MsgPackJsonValueCodec {
    constructor(writer) {
        this.id = 'msgpack';
        this.format = 1;
        this.encoder = new msgpack_1.MsgPackEncoder(writer);
        this.decoder = new MsgPackDecoder_1.MsgPackDecoder();
    }
}
exports.MsgPackJsonValueCodec = MsgPackJsonValueCodec;
//# sourceMappingURL=msgpack.js.map