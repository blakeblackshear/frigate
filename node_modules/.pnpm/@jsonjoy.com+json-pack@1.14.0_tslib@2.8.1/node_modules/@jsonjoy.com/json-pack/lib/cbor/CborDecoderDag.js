"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CborDecoderDag = void 0;
const JsonPackExtension_1 = require("../JsonPackExtension");
const CborDecoder_1 = require("./CborDecoder");
class CborDecoderDag extends CborDecoder_1.CborDecoder {
    readTagRaw(tag) {
        const value = this.readAny();
        return tag === 42 ? new JsonPackExtension_1.JsonPackExtension(tag, value) : value;
    }
}
exports.CborDecoderDag = CborDecoderDag;
//# sourceMappingURL=CborDecoderDag.js.map