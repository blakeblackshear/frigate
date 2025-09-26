"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsaNodeReadStream = void 0;
const stream_1 = require("../vendor/node/stream");
const Defer_1 = require("thingies/lib/Defer");
const concurrency_1 = require("thingies/lib/concurrency");
class FsaNodeReadStream extends stream_1.Readable {
    constructor(fs, handle, path, options) {
        super();
        this.fs = fs;
        this.handle = handle;
        this.path = path;
        this.options = options;
        this.__pending__ = true;
        this.__closed__ = false;
        this.__bytes__ = 0;
        this.__mutex__ = (0, concurrency_1.concurrency)(1);
        this.__file__ = new Defer_1.Defer();
        handle
            .then(file => {
            if (this.__closed__)
                return;
            this.__file__.resolve(file);
            if (this.options.fd !== undefined)
                this.emit('open', file.fd);
            this.emit('ready');
        })
            .catch(error => {
            this.__file__.reject(error);
        })
            .finally(() => {
            this.__pending__ = false;
        });
    }
    async __read__() {
        return await this.__mutex__(async () => {
            if (this.__closed__)
                return;
            const { file } = await this.__file__.promise;
            const blob = await file.getFile();
            const buffer = await blob.arrayBuffer();
            const start = this.options.start || 0;
            let end = typeof this.options.end === 'number' ? this.options.end + 1 : buffer.byteLength;
            if (end > buffer.byteLength)
                end = buffer.byteLength;
            const uint8 = new Uint8Array(buffer, start, end - start);
            return uint8;
        });
    }
    __close__() {
        if (this.__closed__)
            return;
        this.__closed__ = true;
        if (this.options.autoClose) {
            this.__file__.promise
                .then(file => {
                this.fs.close(file.fd, () => {
                    this.emit('close');
                });
                return file.close();
            })
                .catch(error => { });
        }
    }
    // -------------------------------------------------------------- IReadStream
    get bytesRead() {
        return this.__bytes__;
    }
    get pending() {
        return this.__pending__;
    }
    // ----------------------------------------------------------------- Readable
    _read() {
        this.__read__().then((uint8) => {
            if (this.__closed__)
                return;
            if (!uint8)
                return this.push(null);
            this.__bytes__ += uint8.length;
            this.__close__();
            this.push(uint8);
            this.push(null);
        }, error => {
            this.__close__();
            this.destroy(error);
        });
    }
}
exports.FsaNodeReadStream = FsaNodeReadStream;
//# sourceMappingURL=FsaNodeReadStream.js.map