"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreFileSystemObserver = void 0;
class CoreFileSystemObserver {
    constructor(_core, callback) {
        this._core = _core;
        this.callback = callback;
    }
    async observe(handle, options) {
        throw new Error('Method not implemented.');
    }
    /** Disconnect and stop all observations. */
    disconnect() {
        throw new Error('Method not implemented.');
    }
}
exports.CoreFileSystemObserver = CoreFileSystemObserver;
//# sourceMappingURL=CoreFileSystemObserver.js.map