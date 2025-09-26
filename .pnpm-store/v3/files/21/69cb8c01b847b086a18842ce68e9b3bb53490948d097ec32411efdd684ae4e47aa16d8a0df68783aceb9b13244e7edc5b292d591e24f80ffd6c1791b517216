"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LruMap = void 0;
class LruMap extends Map {
    constructor(
    // 2^30 - 1 (a SMI in V8, for 32-bit platforms)
    limit = 1073741823) {
        super();
        this.limit = limit;
    }
    set(key, value) {
        super.delete(key);
        super.set(key, value);
        if (super.size > this.limit)
            super.delete(super.keys().next().value);
        return this;
    }
    get(key) {
        const value = super.get(key);
        if (value === void 0) {
            if (super.delete(key))
                super.set(key, value);
            return value;
        }
        super.delete(key);
        super.set(key, value);
        return value;
    }
}
exports.LruMap = LruMap;
