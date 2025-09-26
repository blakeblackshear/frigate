"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsPromises = void 0;
const util_1 = require("./util");
const constants_1 = require("../constants");
// AsyncIterator implementation for promises.watch
class FSWatchAsyncIterator {
    constructor(fs, path, options = {}) {
        this.fs = fs;
        this.path = path;
        this.options = options;
        this.eventQueue = [];
        this.resolveQueue = [];
        this.finished = false;
        this.maxQueue = options.maxQueue || 2048;
        this.overflow = options.overflow || 'ignore';
        this.startWatching();
        // Handle AbortSignal
        if (options.signal) {
            if (options.signal.aborted) {
                this.finish();
                return;
            }
            options.signal.addEventListener('abort', () => {
                this.finish();
            });
        }
    }
    startWatching() {
        try {
            this.watcher = this.fs.watch(this.path, this.options, (eventType, filename) => {
                this.enqueueEvent({ eventType, filename });
            });
        }
        catch (error) {
            // If we can't start watching, finish immediately
            this.finish();
            throw error;
        }
    }
    enqueueEvent(event) {
        if (this.finished)
            return;
        // Handle queue overflow
        if (this.eventQueue.length >= this.maxQueue) {
            if (this.overflow === 'throw') {
                const error = new Error(`Watch queue overflow: more than ${this.maxQueue} events queued`);
                this.finish(error);
                return;
            }
            else {
                // 'ignore' - drop the oldest event
                this.eventQueue.shift();
                console.warn(`Watch queue overflow: dropping event due to exceeding maxQueue of ${this.maxQueue}`);
            }
        }
        this.eventQueue.push(event);
        // If there's a waiting promise, resolve it
        if (this.resolveQueue.length > 0) {
            const { resolve } = this.resolveQueue.shift();
            const nextEvent = this.eventQueue.shift();
            resolve({ value: nextEvent, done: false });
        }
    }
    finish(error) {
        if (this.finished)
            return;
        this.finished = true;
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        // Resolve or reject all pending promises
        while (this.resolveQueue.length > 0) {
            const { resolve, reject } = this.resolveQueue.shift();
            if (error) {
                reject(error);
            }
            else {
                resolve({ value: undefined, done: true });
            }
        }
    }
    async next() {
        if (this.finished) {
            return { value: undefined, done: true };
        }
        // If we have queued events, return one
        if (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            return { value: event, done: false };
        }
        // Otherwise, wait for the next event
        return new Promise((resolve, reject) => {
            this.resolveQueue.push({ resolve, reject });
        });
    }
    async return() {
        this.finish();
        return { value: undefined, done: true };
    }
    async throw(error) {
        this.finish(error);
        throw error;
    }
    [Symbol.asyncIterator]() {
        return this;
    }
}
class FsPromises {
    constructor(fs, FileHandle) {
        this.fs = fs;
        this.FileHandle = FileHandle;
        this.constants = constants_1.constants;
        this.cp = (0, util_1.promisify)(this.fs, 'cp');
        this.opendir = (0, util_1.promisify)(this.fs, 'opendir');
        this.statfs = (0, util_1.promisify)(this.fs, 'statfs');
        this.lutimes = (0, util_1.promisify)(this.fs, 'lutimes');
        this.glob = (0, util_1.promisify)(this.fs, 'glob');
        this.access = (0, util_1.promisify)(this.fs, 'access');
        this.chmod = (0, util_1.promisify)(this.fs, 'chmod');
        this.chown = (0, util_1.promisify)(this.fs, 'chown');
        this.copyFile = (0, util_1.promisify)(this.fs, 'copyFile');
        this.lchmod = (0, util_1.promisify)(this.fs, 'lchmod');
        this.lchown = (0, util_1.promisify)(this.fs, 'lchown');
        this.link = (0, util_1.promisify)(this.fs, 'link');
        this.lstat = (0, util_1.promisify)(this.fs, 'lstat');
        this.mkdir = (0, util_1.promisify)(this.fs, 'mkdir');
        this.mkdtemp = (0, util_1.promisify)(this.fs, 'mkdtemp');
        this.readdir = (0, util_1.promisify)(this.fs, 'readdir');
        this.readlink = (0, util_1.promisify)(this.fs, 'readlink');
        this.realpath = (0, util_1.promisify)(this.fs, 'realpath');
        this.rename = (0, util_1.promisify)(this.fs, 'rename');
        this.rmdir = (0, util_1.promisify)(this.fs, 'rmdir');
        this.rm = (0, util_1.promisify)(this.fs, 'rm');
        this.stat = (0, util_1.promisify)(this.fs, 'stat');
        this.symlink = (0, util_1.promisify)(this.fs, 'symlink');
        this.truncate = (0, util_1.promisify)(this.fs, 'truncate');
        this.unlink = (0, util_1.promisify)(this.fs, 'unlink');
        this.utimes = (0, util_1.promisify)(this.fs, 'utimes');
        this.readFile = (id, options) => {
            return (0, util_1.promisify)(this.fs, 'readFile')(id instanceof this.FileHandle ? id.fd : id, options);
        };
        this.appendFile = (path, data, options) => {
            return (0, util_1.promisify)(this.fs, 'appendFile')(path instanceof this.FileHandle ? path.fd : path, data, options);
        };
        this.open = (path, flags = 'r', mode) => {
            return (0, util_1.promisify)(this.fs, 'open', fd => new this.FileHandle(this.fs, fd))(path, flags, mode);
        };
        this.writeFile = (id, data, options) => {
            const dataPromise = (0, util_1.isReadableStream)(data) ? (0, util_1.streamToBuffer)(data) : Promise.resolve(data);
            return dataPromise.then(data => (0, util_1.promisify)(this.fs, 'writeFile')(id instanceof this.FileHandle ? id.fd : id, data, options));
        };
        this.watch = (filename, options) => {
            const watchOptions = typeof options === 'string' ? { encoding: options } : options || {};
            return new FSWatchAsyncIterator(this.fs, filename, watchOptions);
        };
    }
}
exports.FsPromises = FsPromises;
//# sourceMappingURL=FsPromises.js.map