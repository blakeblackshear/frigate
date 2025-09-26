"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FanOut = void 0;
class FanOut {
    constructor() {
        this.listeners = new Set();
    }
    emit(data) {
        this.listeners.forEach((listener) => listener(data));
    }
    listen(listener) {
        const listeners = this.listeners;
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
}
exports.FanOut = FanOut;
