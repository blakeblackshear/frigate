"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const noop = () => { };
class Cache {
    constructor(method = noop) {
        this.method = method;
        this.ttl = 10000; // Time how long item is kept in cache without refreshing.
        this.evictionTime = 20000; // After this time item is evicted from cache.
        this.gcPeriod = 30000; // How often to run GC.
        this.maxEntries = 100000;
        this.entries = 0; // Number of values in cache.
        this.map = new Map();
        this.runGC = () => {
            const now = Date.now();
            for (const key of this.map.keys()) {
                const entry = this.map.get(key);
                if (entry && now - entry.t >= this.evictionTime) {
                    this.map.delete(key);
                    this.entries--;
                }
            }
            this.scheduleGC();
        };
        this.stopGC = () => {
            clearTimeout(this.timer);
        };
    }
    put(key, value) {
        const entry = {
            t: Date.now(),
            value,
        };
        if (this.map.get(key)) {
            this.map.set(key, entry);
        }
        else {
            this.map.set(key, entry);
            this.entries++;
        }
        if (this.entries > this.maxEntries) {
            for (const iterationKey of this.map.keys()) {
                if (key !== iterationKey) {
                    this.map.delete(iterationKey);
                    this.entries--;
                    break;
                }
            }
        }
    }
    async getFromSource(key) {
        const value = await this.method(key);
        this.put(key, value);
        return value;
    }
    async get(key) {
        const entry = this.map.get(key);
        if (entry) {
            const now = Date.now();
            if (now - entry.t <= this.ttl) {
                return entry.value;
            }
            else if (now - entry.t <= this.evictionTime) {
                this.getFromSource(key).catch(noop);
                return entry.value;
            }
            else {
                this.map.delete(key);
                this.entries--;
                return await this.getFromSource(key);
            }
        }
        else {
            return await this.getFromSource(key);
        }
    }
    getSync(key) {
        const entry = this.map.get(key);
        if (!entry)
            return null;
        const now = Date.now();
        if (now - entry.t <= this.ttl) {
            return entry.value;
        }
        else if (now - entry.t <= this.evictionTime) {
            this.getFromSource(key).catch(noop);
            return entry.value;
        }
        return null;
    }
    exists(key) {
        const entry = this.map.get(key);
        if (!entry)
            return false;
        const now = Date.now();
        return now - entry.t <= this.evictionTime;
    }
    scheduleGC() {
        this.timer = setTimeout(this.runGC, this.gcPeriod);
        this.timer.unref();
    }
    startGC() {
        this.scheduleGC();
    }
    retire(key, newTime = 0) {
        const entry = this.map.get(key);
        if (!entry)
            return false;
        entry.t = newTime;
        return true;
    }
    remove(key) {
        const success = this.map.delete(key);
        if (success)
            this.entries--;
        return success;
    }
}
exports.Cache = Cache;
