"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsaNodeWriteStream = void 0;
const stream_1 = require("../vendor/node/stream");
const Defer_1 = require("thingies/lib/Defer");
const concurrency_1 = require("thingies/lib/concurrency");
const util_1 = require("../node/util");
const queueMicrotask_1 = require("../queueMicrotask");
/**
 * This WriteStream implementation does not build on top of the `fs` module,
 * but instead uses the lower-level `FileSystemFileHandle` interface. The reason
 * is the different semantics in `fs` and FSA (File System Access API) write streams.
 *
 * When data is written to an FSA file, a new FSA stream is created, it copies
 * the file to a temporary swap file. After each written chunk, that swap file
 * is closed and the original file is replaced with the swap file. This means,
 * if WriteStream was built on top of `fs`, each chunk write would result in
 * a file copy, write, close, rename operations, which is not what we want.
 *
 * Instead this implementation hooks into the lower-level and closes the swap
 * file only once the stream is closed. The downside is that the written data
 * is not immediately visible to other processes (because it is written to the
 * swap file), but that is the trade-off we have to make.
 *
 * @todo Could make this flush the data to the original file periodically, so that
 *       the data is visible to other processes.
 * @todo This stream could work through `FileSystemSyncAccessHandle.write` in a
 *       Worker thread instead.
 */
class FsaNodeWriteStream extends stream_1.Writable {
    constructor(handle, path, options) {
        super();
        this.path = path;
        this.options = options;
        this.__pending__ = true;
        this.__closed__ = false;
        this.__bytes__ = 0;
        this.__mutex__ = (0, concurrency_1.concurrency)(1);
        if (options.start !== undefined) {
            if (typeof options.start !== 'number') {
                throw new TypeError('"start" option must be a Number');
            }
            if (options.start < 0) {
                throw new TypeError('"start" must be >= zero');
            }
        }
        const stream = new Defer_1.Defer();
        this.__stream__ = stream.promise;
        (async () => {
            const fsaHandle = await handle;
            const fileWasOpened = !options.fd;
            if (fileWasOpened)
                this.emit('open', fsaHandle.fd);
            const flags = (0, util_1.flagsToNumber)(options.flags ?? 'w');
            const keepExistingData = flags & 1024 /* FLAG_CON.O_APPEND */ ? true : false;
            const writable = await fsaHandle.file.createWritable({ keepExistingData });
            if (keepExistingData) {
                const start = Number(options.start ?? 0);
                if (start)
                    await writable.seek(start);
            }
            this.__pending__ = false;
            stream.resolve(writable);
        })().catch(error => {
            stream.reject(error);
        });
    }
    async ___write___(buffers) {
        await this.__mutex__(async () => {
            if (this.__closed__)
                return;
            // if (this.__closed__) throw new Error('WriteStream is closed');
            const writable = await this.__stream__;
            for (const buffer of buffers) {
                await writable.write(buffer);
                this.__bytes__ += buffer.byteLength;
            }
        });
    }
    async __close__() {
        const emitClose = this.options.emitClose;
        await this.__mutex__(async () => {
            if (this.__closed__ && emitClose) {
                (0, queueMicrotask_1.default)(() => this.emit('close'));
                return;
            }
            try {
                const writable = await this.__stream__;
                this.__closed__ = true;
                await writable.close();
                if (emitClose)
                    this.emit('close');
            }
            catch (error) {
                this.emit('error', error);
                if (emitClose)
                    this.emit('close', error);
            }
        });
    }
    // ------------------------------------------------------------- IWriteStream
    get bytesWritten() {
        return this.__bytes__;
    }
    get pending() {
        return this.__pending__;
    }
    close(cb) {
        if (cb)
            this.once('close', cb);
        this.__close__().catch(() => { });
    }
    // ----------------------------------------------------------------- Writable
    _write(chunk, encoding, callback) {
        this.___write___([chunk])
            .then(() => {
            if (callback)
                callback(null);
        })
            .catch(error => {
            if (callback)
                callback(error);
        });
    }
    _writev(chunks, callback) {
        const buffers = chunks.map(({ chunk }) => chunk);
        this.___write___(buffers)
            .then(() => {
            if (callback)
                callback(null);
        })
            .catch(error => {
            if (callback)
                callback(error);
        });
    }
    _final(callback) {
        this.__close__()
            .then(() => {
            if (callback)
                callback(null);
        })
            .catch(error => {
            if (callback)
                callback(error);
        });
    }
}
exports.FsaNodeWriteStream = FsaNodeWriteStream;
//# sourceMappingURL=FsaNodeWriteStream.js.map