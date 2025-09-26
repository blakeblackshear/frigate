"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonDecoderPartial = exports.DecodeFinishError = void 0;
const JsonDecoder_1 = require("./JsonDecoder");
class DecodeFinishError extends Error {
    constructor(value) {
        super('DECODE_FINISH');
        this.value = value;
    }
}
exports.DecodeFinishError = DecodeFinishError;
class JsonDecoderPartial extends JsonDecoder_1.JsonDecoder {
    readAny() {
        try {
            return super.readAny();
        }
        catch (error) {
            if (error instanceof DecodeFinishError)
                return error.value;
            throw error;
        }
    }
    readArr() {
        const reader = this.reader;
        if (reader.u8() !== 0x5b)
            throw new Error('Invalid JSON');
        const arr = [];
        const uint8 = reader.uint8;
        let first = true;
        while (true) {
            this.skipWhitespace();
            const char = uint8[reader.x];
            if (char === 0x5d)
                return reader.x++, arr;
            if (char === 0x2c)
                reader.x++;
            else if (!first)
                return arr;
            this.skipWhitespace();
            try {
                arr.push(this.readAny());
            }
            catch (error) {
                if (error instanceof DecodeFinishError)
                    return arr.push(error.value), arr;
                if (error instanceof Error && error.message === 'Invalid JSON')
                    throw new DecodeFinishError(arr);
                throw error;
            }
            first = false;
        }
    }
    readObj() {
        const reader = this.reader;
        if (reader.u8() !== 0x7b)
            throw new Error('Invalid JSON');
        const obj = {};
        const uint8 = reader.uint8;
        while (true) {
            this.skipWhitespace();
            let char = uint8[reader.x];
            if (char === 0x7d)
                return reader.x++, obj;
            if (char === 0x2c) {
                reader.x++;
                continue;
            }
            try {
                char = uint8[reader.x++];
                if (char !== 0x22)
                    throw new Error('Invalid JSON');
                const key = (0, JsonDecoder_1.readKey)(reader);
                if (key === '__proto__')
                    throw new Error('Invalid JSON');
                this.skipWhitespace();
                if (reader.u8() !== 0x3a)
                    throw new Error('Invalid JSON');
                this.skipWhitespace();
                try {
                    obj[key] = this.readAny();
                }
                catch (error) {
                    if (error instanceof DecodeFinishError) {
                        obj[key] = error.value;
                        return obj;
                    }
                    throw error;
                }
            }
            catch (error) {
                if (error instanceof DecodeFinishError)
                    return obj;
                if (error instanceof Error && error.message === 'Invalid JSON')
                    throw new DecodeFinishError(obj);
                throw error;
            }
        }
    }
}
exports.JsonDecoderPartial = JsonDecoderPartial;
//# sourceMappingURL=JsonDecoderPartial.js.map