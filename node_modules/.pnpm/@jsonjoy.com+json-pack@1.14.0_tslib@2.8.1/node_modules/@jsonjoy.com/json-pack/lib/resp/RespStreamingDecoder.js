"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RespStreamingDecoder = void 0;
const StreamingReader_1 = require("@jsonjoy.com/buffers/lib/StreamingReader");
const RespDecoder_1 = require("./RespDecoder");
class RespStreamingDecoder {
    constructor() {
        this.reader = new StreamingReader_1.StreamingReader();
        this.decoder = new RespDecoder_1.RespDecoder(this.reader);
    }
    get tryUtf8() {
        return this.decoder.tryUtf8;
    }
    set tryUtf8(value) {
        this.decoder.tryUtf8 = value;
    }
    push(uint8) {
        this.reader.push(uint8);
    }
    read() {
        const reader = this.reader;
        if (reader.size() === 0)
            return undefined;
        const x = reader.x;
        try {
            const val = this.decoder.readAny();
            reader.consume();
            return val;
        }
        catch (error) {
            if (error instanceof RangeError) {
                reader.x = x;
                return undefined;
            }
            else
                throw error;
        }
    }
    readCmd() {
        const reader = this.reader;
        if (reader.size() === 0)
            return undefined;
        const x = reader.x;
        try {
            const args = this.decoder.readCmd();
            reader.consume();
            return args;
        }
        catch (error) {
            if (error instanceof RangeError) {
                reader.x = x;
                return undefined;
            }
            else
                throw error;
        }
    }
    skip() {
        const reader = this.reader;
        if (reader.size() === 0)
            return undefined;
        const x = reader.x;
        try {
            this.decoder.skipAny();
            reader.consume();
            return null;
        }
        catch (error) {
            if (error instanceof RangeError) {
                reader.x = x;
                return undefined;
            }
            else
                throw error;
        }
    }
}
exports.RespStreamingDecoder = RespStreamingDecoder;
//# sourceMappingURL=RespStreamingDecoder.js.map