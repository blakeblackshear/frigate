"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LruTtlMap = void 0;
const LruMap_1 = require("./LruMap");
class LruTtlMap extends LruMap_1.LruMap {
    constructor() {
        super(...arguments);
        this.expiry = new Map();
    }
    clear() {
        this.expiry.clear();
        super.clear();
    }
    delete(key) {
        this.expiry.delete(key);
        return super.delete(key);
    }
    has(key, now = 0) {
        if (!super.has(key))
            return false;
        const expiry = this.expiry.get(key) || 0;
        const expired = now > expiry;
        if (expired)
            this.delete(key);
        return !expired;
    }
    get(key, now) {
        if (!this.has(key, now))
            return undefined;
        const value = super.get(key);
        super.set(key, value);
        return value;
    }
    set(key, value, expiry = Infinity) {
        super.set(key, value);
        this.expiry.set(key, expiry);
        return this;
    }
}
exports.LruTtlMap = LruTtlMap;
