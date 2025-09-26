"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachedUtf8Decoder = void 0;
const tslib_1 = require("tslib");
const v10_1 = tslib_1.__importDefault(require("./decodeUtf8/v10"));
let x = 1 + Math.round(Math.random() * ((-1 >>> 0) - 1));
function randomU32(min, max) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % (max - min + 1)) + min;
}
class CacheItem {
    constructor(bytes, value) {
        this.bytes = bytes;
        this.value = value;
    }
}
class CachedUtf8Decoder {
    constructor() {
        this.caches = [];
        for (let i = 0; i < 31; i++)
            this.caches.push([]);
    }
    get(bytes, offset, size) {
        const records = this.caches[size - 1];
        const len = records.length;
        FIND_CHUNK: for (let i = 0; i < len; i++) {
            const record = records[i];
            const recordBytes = record.bytes;
            for (let j = 0; j < size; j++)
                if (recordBytes[j] !== bytes[offset + j])
                    continue FIND_CHUNK;
            return record.value;
        }
        return null;
    }
    store(bytes, value) {
        const records = this.caches[bytes.length - 1];
        const record = new CacheItem(bytes, value);
        const length = records.length;
        if (length >= 16)
            records[randomU32(0, 16 - 1)] = record;
        else
            records.push(record);
    }
    decode(bytes, offset, size) {
        if (!size)
            return '';
        const cachedValue = this.get(bytes, offset, size);
        if (cachedValue !== null)
            return cachedValue;
        const value = (0, v10_1.default)(bytes, offset, size);
        const copy = Uint8Array.prototype.slice.call(bytes, offset, offset + size);
        this.store(copy, value);
        return value;
    }
}
exports.CachedUtf8Decoder = CachedUtf8Decoder;
//# sourceMappingURL=CachedUtf8Decoder.js.map