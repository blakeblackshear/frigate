"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileHandle = void 0;
const util_1 = require("./util");
const events_1 = require("../vendor/node/events");
class FileHandle extends events_1.EventEmitter {
    constructor(fs, fd) {
        super();
        this.refs = 1;
        this.closePromise = null;
        this.position = 0;
        this.readableWebStreamLocked = false;
        this.fs = fs;
        this.fd = fd;
    }
    getAsyncId() {
        // Return a unique async ID for this file handle
        // In a real implementation, this would be provided by the underlying system
        return this.fd;
    }
    appendFile(data, options) {
        return (0, util_1.promisify)(this.fs, 'appendFile')(this.fd, data, options);
    }
    chmod(mode) {
        return (0, util_1.promisify)(this.fs, 'fchmod')(this.fd, mode);
    }
    chown(uid, gid) {
        return (0, util_1.promisify)(this.fs, 'fchown')(this.fd, uid, gid);
    }
    close() {
        if (this.fd === -1) {
            return Promise.resolve();
        }
        if (this.closePromise) {
            return this.closePromise;
        }
        this.refs--;
        if (this.refs === 0) {
            const currentFd = this.fd;
            this.fd = -1;
            this.closePromise = (0, util_1.promisify)(this.fs, 'close')(currentFd).finally(() => {
                this.closePromise = null;
            });
        }
        else {
            this.closePromise = new Promise((resolve, reject) => {
                this.closeResolve = resolve;
                this.closeReject = reject;
            }).finally(() => {
                this.closePromise = null;
                this.closeReject = undefined;
                this.closeResolve = undefined;
            });
        }
        this.emit('close');
        return this.closePromise;
    }
    datasync() {
        return (0, util_1.promisify)(this.fs, 'fdatasync')(this.fd);
    }
    createReadStream(options) {
        return this.fs.createReadStream('', { ...options, fd: this });
    }
    createWriteStream(options) {
        return this.fs.createWriteStream('', { ...options, fd: this });
    }
    readableWebStream(options = {}) {
        const { type = 'bytes', autoClose = false } = options;
        let position = 0;
        if (this.fd === -1) {
            throw new Error('The FileHandle is closed');
        }
        if (this.closePromise) {
            throw new Error('The FileHandle is closing');
        }
        if (this.readableWebStreamLocked) {
            throw new Error('An error will be thrown if this method is called more than once or is called after the FileHandle is closed or closing.');
        }
        this.readableWebStreamLocked = true;
        this.ref();
        const unlockAndCleanup = () => {
            this.readableWebStreamLocked = false;
            this.unref();
            if (autoClose) {
                this.close().catch(() => {
                    // Ignore close errors in cleanup
                });
            }
        };
        return new ReadableStream({
            type: type === 'bytes' ? 'bytes' : undefined,
            autoAllocateChunkSize: 16384,
            pull: async (controller) => {
                try {
                    const view = controller.byobRequest?.view;
                    if (!view) {
                        // Fallback for when BYOB is not available
                        const buffer = new Uint8Array(16384);
                        const result = await this.read(buffer, 0, buffer.length, position);
                        if (result.bytesRead === 0) {
                            controller.close();
                            unlockAndCleanup();
                            return;
                        }
                        position += result.bytesRead;
                        controller.enqueue(buffer.slice(0, result.bytesRead));
                        return;
                    }
                    const result = await this.read(view, view.byteOffset, view.byteLength, position);
                    if (result.bytesRead === 0) {
                        controller.close();
                        unlockAndCleanup();
                        return;
                    }
                    position += result.bytesRead;
                    controller.byobRequest.respond(result.bytesRead);
                }
                catch (error) {
                    controller.error(error);
                    unlockAndCleanup();
                }
            },
            cancel: async () => {
                unlockAndCleanup();
            },
        });
    }
    async read(buffer, offset, length, position) {
        const readPosition = position !== null && position !== undefined ? position : this.position;
        const result = await (0, util_1.promisify)(this.fs, 'read', bytesRead => ({ bytesRead, buffer }))(this.fd, buffer, offset, length, readPosition);
        // Update internal position only if position was null/undefined
        if (position === null || position === undefined) {
            this.position += result.bytesRead;
        }
        return result;
    }
    readv(buffers, position) {
        return (0, util_1.promisify)(this.fs, 'readv', bytesRead => ({ bytesRead, buffers }))(this.fd, buffers, position);
    }
    readFile(options) {
        return (0, util_1.promisify)(this.fs, 'readFile')(this.fd, options);
    }
    stat(options) {
        return (0, util_1.promisify)(this.fs, 'fstat')(this.fd, options);
    }
    sync() {
        return (0, util_1.promisify)(this.fs, 'fsync')(this.fd);
    }
    truncate(len) {
        return (0, util_1.promisify)(this.fs, 'ftruncate')(this.fd, len);
    }
    utimes(atime, mtime) {
        return (0, util_1.promisify)(this.fs, 'futimes')(this.fd, atime, mtime);
    }
    async write(buffer, offset, length, position) {
        const useInternalPosition = typeof position !== 'number';
        const writePosition = useInternalPosition ? this.position : position;
        const result = await (0, util_1.promisify)(this.fs, 'write', bytesWritten => ({ bytesWritten, buffer }))(this.fd, buffer, offset, length, writePosition);
        // Update internal position only if position was null/undefined
        if (useInternalPosition) {
            this.position += result.bytesWritten;
        }
        return result;
    }
    writev(buffers, position) {
        return (0, util_1.promisify)(this.fs, 'writev', bytesWritten => ({ bytesWritten, buffers }))(this.fd, buffers, position);
    }
    writeFile(data, options) {
        return (0, util_1.promisify)(this.fs, 'writeFile')(this.fd, data, options);
    }
    // Implement Symbol.asyncDispose if available (ES2023+)
    async [Symbol.asyncDispose]() {
        await this.close();
    }
    ref() {
        this.refs++;
    }
    unref() {
        this.refs--;
        if (this.refs === 0) {
            this.fd = -1;
            if (this.closeResolve) {
                (0, util_1.promisify)(this.fs, 'close')(this.fd).then(this.closeResolve, this.closeReject);
            }
        }
    }
}
exports.FileHandle = FileHandle;
//# sourceMappingURL=FileHandle.js.map