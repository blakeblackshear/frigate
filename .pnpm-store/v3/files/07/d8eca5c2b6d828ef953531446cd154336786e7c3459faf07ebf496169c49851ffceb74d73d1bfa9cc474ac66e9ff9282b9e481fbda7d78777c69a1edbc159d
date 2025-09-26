"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeFileSystemFileHandle = void 0;
const NodeFileSystemHandle_1 = require("./NodeFileSystemHandle");
const NodeFileSystemSyncAccessHandle_1 = require("./NodeFileSystemSyncAccessHandle");
const util_1 = require("./util");
const NodeFileSystemWritableFileStream_1 = require("./NodeFileSystemWritableFileStream");
class NodeFileSystemFileHandle extends NodeFileSystemHandle_1.NodeFileSystemHandle {
    constructor(fs, __path, ctx = {}) {
        ctx = (0, util_1.ctx)(ctx);
        super('file', (0, util_1.basename)(__path, ctx.separator));
        this.fs = fs;
        this.__path = __path;
        this.ctx = ctx;
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
            const promises = this.fs.promises;
            const stats = await promises.stat(path);
            // TODO: Once implemented, use promises.readAsBlob() instead of promises.readFile().
            const data = await promises.readFile(path);
            const file = new File([data], this.name, { lastModified: stats.mtime.getTime() });
            return file;
        }
        catch (error) {
            if (error instanceof DOMException)
                throw error;
            if (error && typeof error === 'object') {
                switch (error.code) {
                    case 'EPERM':
                    case 'EACCES':
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
        return async () => new NodeFileSystemSyncAccessHandle_1.NodeFileSystemSyncAccessHandle(this.fs, this.__path, this.ctx);
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable
     */
    async createWritable({ keepExistingData = false } = { keepExistingData: false }) {
        (0, util_1.assertCanWrite)(this.ctx.mode);
        return new NodeFileSystemWritableFileStream_1.NodeFileSystemWritableFileStream(this.fs, this.__path, keepExistingData);
    }
}
exports.NodeFileSystemFileHandle = NodeFileSystemFileHandle;
//# sourceMappingURL=NodeFileSystemFileHandle.js.map