"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IonDecoder = void 0;
const IonDecoderBase_1 = require("./IonDecoderBase");
const Import_1 = require("./Import");
const symbols_1 = require("./symbols");
class IonDecoder extends IonDecoderBase_1.IonDecoderBase {
    constructor(reader) {
        super(reader);
    }
    decode(data) {
        this.reader.reset(data);
        this.symbols = new Import_1.Import(symbols_1.systemSymbolImport, []);
        this.validateBVM();
        this.readSymbolTable();
        return this.val();
    }
    read() {
        return this.val();
    }
}
exports.IonDecoder = IonDecoder;
//# sourceMappingURL=IonDecoder.js.map