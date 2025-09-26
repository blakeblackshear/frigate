"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeFileSystemSyncAccessHandle = void 0;
const util_1 = require("./util");
const buffer_1 = require("../vendor/node/internal/buffer");
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle
 */
class NodeFileSystemSyncAccessHandle {
    constructor(fs, path, ctx) {
        this.fs = fs;
        this.path = path;
        this.ctx = ctx;
        this.fd = fs.openSync(path, 'r+');
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/close
     */
    async close() {
        (0, util_1.assertCanWrite)(this.ctx.mode);
        this.fs.closeSync(this.fd);
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/flush
     */
    async flush() {
        (0, util_1.assertCanWrite)(this.ctx.mode);
        this.fs.fsyncSync(this.fd);
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/getSize
     */
    async getSize() {
        return this.fs.statSync(this.path).size;
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/read
     */
    async read(buffer, options = {}) {
        const buf = buffer instanceof ArrayBuffer ? buffer_1.Buffer.from(buffer) : buffer;
        try {
            const size = this.fs.readSync(this.fd, buf, 0, buffer.byteLength, options.at ?? 0);
            return size;
        }
        catch (error) {
            if (error instanceof DOMException)
                throw error;
            if (error && typeof error === 'object') {
                switch (error.code) {
                    case 'EBADF': {
                        throw new DOMException('File handle already closed.', 'InvalidStateError');
                    }
                }
            }
            throw error;
        }
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/truncate
     * @param newSize The number of bytes to resize the file to.
     */
    async truncate(newSize) {
        (0, util_1.assertCanWrite)(this.ctx.mode);
        this.fs.truncateSync(this.fd, newSize);
    }
    /**
     * Writes the content of a specified buffer to the file associated with the
     * handle, optionally at a given offset.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/write
     * @param buffer
     * @param options
     */
    async write(buffer, options = {}) {
        (0, util_1.assertCanWrite)(this.ctx.mode);
        const buf = buffer instanceof ArrayBuffer ? buffer_1.Buffer.from(buffer) : buffer;
        try {
            return this.fs.writeSync(this.fd, buf, 0, buffer.byteLength, options.at ?? 0);
        }
        catch (error) {
            if (error instanceof DOMException)
                throw error;
            if (error && typeof error === 'object') {
                switch (error.code) {
                    case 'EBADF': {
                        throw new DOMException('File handle already closed.', 'InvalidStateError');
                    }
                }
            }
            throw error;
        }
    }
}
exports.NodeFileSystemSyncAccessHandle = NodeFileSystemSyncAccessHandle;
//# sourceMappingURL=NodeFileSystemSyncAccessHandle.js.map