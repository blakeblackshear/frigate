"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreFileSystemFileHandle = void 0;
const CoreFileSystemHandle_1 = require("./CoreFileSystemHandle");
const CoreFileSystemSyncAccessHandle_1 = require("./CoreFileSystemSyncAccessHandle");
const util_1 = require("./util");
const CoreFileSystemWritableFileStream_1 = require("./CoreFileSystemWritableFileStream");
class CoreFileSystemFileHandle extends CoreFileSystemHandle_1.CoreFileSystemHandle {
    constructor(_core, __path, ctx = {}) {
        const fullCtx = (0, util_1.ctx)(ctx);
        super('file', (0, util_1.basename)(__path, fullCtx.separator), fullCtx);
        this._core = _core;
        this.__path = __path;
        this.ctx = fullCtx;
    }
    /**
     * Returns a {@link Promise} which resolves to a {@link File} object
     * representing the state on disk of the entry represented by the handle.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/getFile
     */
    async getFile() {
        try {
            const path = this.__path;
            const link = this._core.getResolvedLinkOrThrow(path);
            const node = link.getNode();
            if (!node.isFile()) {
                throw new Error('Not a file');
            }
            // Get file stats for lastModified
            const lastModified = node.mtime ? node.mtime.getTime() : Date.now();
            // Read file content
            const buffer = node.getBuffer();
            const data = new Uint8Array(buffer);
            const file = new File([data], this.name, { lastModified });
            return file;
        }
        catch (error) {
            if (error instanceof DOMException)
                throw error;
            if (error && typeof error === 'object') {
                switch (error.code) {
                    case "EACCES" /* ERROR_CODE.EACCES */:
                        throw (0, util_1.newNotAllowedError)();
                }
            }
            throw error;
        }
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createSyncAccessHandle
     */
    get createSyncAccessHandle() {
        if (!this.ctx.syncHandleAllowed)
            return undefined;
        return async () => new CoreFileSystemSyncAccessHandle_1.CoreFileSystemSyncAccessHandle(this._core, this.__path, this.ctx);
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable
     */
    async createWritable({ keepExistingData = false } = { keepExistingData: false }) {
        (0, util_1.assertCanWrite)(this.ctx.mode);
        return new CoreFileSystemWritableFileStream_1.CoreFileSystemWritableFileStream(this._core, this.__path, keepExistingData);
    }
}
exports.CoreFileSystemFileHandle = CoreFileSystemFileHandle;
//# sourceMappingURL=CoreFileSystemFileHandle.js.map