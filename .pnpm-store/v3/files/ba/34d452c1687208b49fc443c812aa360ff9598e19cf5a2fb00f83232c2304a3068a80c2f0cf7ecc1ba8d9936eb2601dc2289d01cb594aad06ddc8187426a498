"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreFileSystemWritableFileStream = void 0;
const buffer_1 = require("../vendor/node/internal/buffer");
const util_1 = require("./util");
const constants_1 = require("../node/constants");
const WS = (typeof WritableStream === 'undefined' ? require('stream/web').WritableStream : WritableStream);
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream
 */
class CoreFileSystemWritableFileStream extends WS {
    constructor(core, path, keepExistingData = false) {
        let fd;
        super({
            start: controller => {
                // Open file for writing
                const flags = keepExistingData ? constants_1.FLAGS['r+'] : constants_1.FLAGS.w;
                try {
                    fd = core.open(path, flags, 438 /* MODE.FILE */);
                }
                catch (error) {
                    if (error && typeof error === 'object' && error.code === "EACCES" /* ERROR_CODE.EACCES */) {
                        throw (0, util_1.newNotAllowedError)();
                    }
                    throw error;
                }
            },
            write: async (chunk) => {
                await this._write(chunk);
            },
            close: async () => {
                if (!this._closed && this._fd !== undefined) {
                    core.close(this._fd);
                    this._closed = true;
                }
            },
            abort: async () => {
                if (!this._closed && this._fd !== undefined) {
                    core.close(this._fd);
                    this._closed = true;
                }
            },
        });
        this._position = 0;
        this._closed = false;
        this._core = core;
        this._path = path;
        this._fd = fd;
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/seek
     */
    async seek(position) {
        if (this._closed) {
            throw new DOMException('The stream is closed.', 'InvalidStateError');
        }
        this._position = position;
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/truncate
     */
    async truncate(size) {
        if (this._closed) {
            throw new DOMException('The stream is closed.', 'InvalidStateError');
        }
        try {
            const link = this._core.getResolvedLinkOrThrow(this._path);
            const node = link.getNode();
            node.truncate(size);
        }
        catch (error) {
            if (error && typeof error === 'object' && error.code === "EACCES" /* ERROR_CODE.EACCES */) {
                throw (0, util_1.newNotAllowedError)();
            }
            throw error;
        }
    }
    async write(chunkOrParams) {
        await this._write(chunkOrParams);
    }
    async _write(chunkOrParams) {
        if (this._closed) {
            throw new DOMException('The stream is closed.', 'InvalidStateError');
        }
        if (this._fd === undefined) {
            throw new DOMException('The stream is not ready.', 'InvalidStateError');
        }
        try {
            if (this._isParams(chunkOrParams)) {
                const params = chunkOrParams;
                switch (params.type) {
                    case 'write': {
                        if (params.data !== undefined) {
                            const buffer = this._dataToBuffer(params.data);
                            const position = params.position !== undefined ? params.position : this._position;
                            const written = this._core.write(this._fd, buffer, 0, buffer.length, position);
                            if (params.position === undefined) {
                                this._position += written;
                            }
                        }
                        break;
                    }
                    case 'seek': {
                        if (params.position !== undefined) {
                            this._position = params.position;
                        }
                        break;
                    }
                    case 'truncate': {
                        if (params.size !== undefined) {
                            await this.truncate(params.size);
                        }
                        break;
                    }
                }
            }
            else {
                // Direct data write
                const buffer = this._dataToBuffer(chunkOrParams);
                const written = this._core.write(this._fd, buffer, 0, buffer.length, this._position);
                this._position += written;
            }
        }
        catch (error) {
            if (error && typeof error === 'object' && error.code === "EACCES" /* ERROR_CODE.EACCES */) {
                throw (0, util_1.newNotAllowedError)();
            }
            throw error;
        }
    }
    _isParams(chunk) {
        return !!(chunk && typeof chunk === 'object' && 'type' in chunk);
    }
    _dataToBuffer(data) {
        if (typeof data === 'string') {
            return buffer_1.Buffer.from(data, 'utf8');
        }
        if (data instanceof buffer_1.Buffer) {
            return data;
        }
        if (data instanceof ArrayBuffer) {
            return buffer_1.Buffer.from(data);
        }
        if (ArrayBuffer.isView(data)) {
            return buffer_1.Buffer.from(data.buffer, data.byteOffset, data.byteLength);
        }
        if (data instanceof Blob) {
            // For Blob, we would need to read it asynchronously
            // This is a simplified implementation
            throw new Error('Blob data type not fully supported in this implementation');
        }
        throw new Error('Unsupported data type');
    }
}
exports.CoreFileSystemWritableFileStream = CoreFileSystemWritableFileStream;
//# sourceMappingURL=CoreFileSystemWritableFileStream.js.map