"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dir = void 0;
const util_1 = require("./util");
const Dirent_1 = require("./Dirent");
const errors = require("../vendor/node/internal/errors");
/**
 * A directory stream, like `fs.Dir`.
 */
class Dir {
    constructor(link, options) {
        this.link = link;
        this.options = options;
        this.iteratorInfo = [];
        this.closed = false;
        this.operationQueue = null;
        this.path = link.getPath();
        this.iteratorInfo.push(link.children[Symbol.iterator]());
    }
    closeBase() {
        // In a real filesystem implementation, this would close file descriptors
        // For memfs, we just need to mark as closed
    }
    readBase(iteratorInfo) {
        let done;
        let value;
        let name;
        let link;
        do {
            do {
                ({ done, value } = iteratorInfo[iteratorInfo.length - 1].next());
                if (!done) {
                    [name, link] = value;
                }
                else {
                    break;
                }
            } while (name === '.' || name === '..');
            if (done) {
                iteratorInfo.pop();
                if (iteratorInfo.length === 0) {
                    break;
                }
                else {
                    done = false;
                }
            }
            else {
                if (this.options.recursive && link.children.size) {
                    iteratorInfo.push(link.children[Symbol.iterator]());
                }
                return Dirent_1.default.build(link, this.options.encoding);
            }
        } while (!done);
        return null;
    }
    close(callback) {
        // Promise-based close
        if (callback === undefined) {
            if (this.closed) {
                return Promise.reject(new errors.Error('ERR_DIR_CLOSED'));
            }
            return new Promise((resolve, reject) => {
                this.close(err => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
        // Callback-based close
        (0, util_1.validateCallback)(callback);
        if (this.closed) {
            process.nextTick(callback, new errors.Error('ERR_DIR_CLOSED'));
            return;
        }
        if (this.operationQueue !== null) {
            this.operationQueue.push(() => {
                this.close(callback);
            });
            return;
        }
        this.closed = true;
        try {
            this.closeBase();
            process.nextTick(callback);
        }
        catch (err) {
            process.nextTick(callback, err);
        }
    }
    closeSync() {
        if (this.closed) {
            throw new errors.Error('ERR_DIR_CLOSED');
        }
        if (this.operationQueue !== null) {
            throw new errors.Error('ERR_DIR_CONCURRENT_OPERATION');
        }
        this.closed = true;
        this.closeBase();
    }
    read(callback) {
        // Promise-based read
        if (callback === undefined) {
            return new Promise((resolve, reject) => {
                this.read((err, result) => {
                    if (err)
                        reject(err);
                    else
                        resolve(result ?? null);
                });
            });
        }
        // Callback-based read
        (0, util_1.validateCallback)(callback);
        if (this.closed) {
            process.nextTick(callback, new errors.Error('ERR_DIR_CLOSED'));
            return;
        }
        if (this.operationQueue !== null) {
            this.operationQueue.push(() => {
                this.read(callback);
            });
            return;
        }
        this.operationQueue = [];
        try {
            const result = this.readBase(this.iteratorInfo);
            process.nextTick(() => {
                const queue = this.operationQueue;
                this.operationQueue = null;
                for (const op of queue)
                    op();
                callback(null, result);
            });
        }
        catch (err) {
            process.nextTick(() => {
                const queue = this.operationQueue;
                this.operationQueue = null;
                for (const op of queue)
                    op();
                callback(err);
            });
        }
    }
    readSync() {
        if (this.closed) {
            throw new errors.Error('ERR_DIR_CLOSED');
        }
        if (this.operationQueue !== null) {
            throw new errors.Error('ERR_DIR_CONCURRENT_OPERATION');
        }
        return this.readBase(this.iteratorInfo);
    }
    [Symbol.asyncIterator]() {
        return {
            next: async () => {
                try {
                    const dirEnt = await this.read();
                    if (dirEnt !== null) {
                        return { done: false, value: dirEnt };
                    }
                    else {
                        return { done: true, value: undefined };
                    }
                }
                catch (err) {
                    throw err;
                }
            },
            [Symbol.asyncIterator]() {
                return this;
            },
        };
    }
}
exports.Dir = Dir;
//# sourceMappingURL=Dir.js.map