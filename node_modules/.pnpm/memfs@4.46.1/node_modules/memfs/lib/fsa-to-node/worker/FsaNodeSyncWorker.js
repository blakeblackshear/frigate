"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsaNodeSyncWorker = void 0;
const SyncMessenger_1 = require("./SyncMessenger");
const FsaNodeFs_1 = require("../FsaNodeFs");
const json_1 = require("../json");
class FsaNodeSyncWorker {
    constructor() {
        this.sab = new SharedArrayBuffer(1024 * 1024);
        this.messenger = new SyncMessenger_1.SyncMessenger(this.sab);
        this.onPostMessage = (msg) => {
            switch (msg[0]) {
                case 1 /* FsaNodeWorkerMessageCode.SetRoot */: {
                    const [, id, dir] = msg;
                    this.root = dir;
                    this.fs = new FsaNodeFs_1.FsaNodeFs(this.root);
                    const response = [2 /* FsaNodeWorkerMessageCode.RootSet */, id];
                    postMessage(response);
                    this.messenger.serveAsync(this.onRequest);
                    break;
                }
            }
        };
        this.onRequest = async (request) => {
            try {
                const message = json_1.decoder.decode(request);
                if (!Array.isArray(message))
                    throw new Error('Invalid message format');
                const code = message[0];
                if (code !== 3 /* FsaNodeWorkerMessageCode.Request */)
                    throw new Error('Invalid message code');
                const [, method, payload] = message;
                const handler = this.handlers[method];
                if (!handler)
                    throw new Error(`Unknown method ${method}`);
                const response = await handler(payload);
                return json_1.encoder.encode([4 /* FsaNodeWorkerMessageCode.Response */, response]);
            }
            catch (err) {
                const message = err && typeof err === 'object' && err.message ? err.message : 'Unknown error';
                const error = { message };
                if (err && typeof err === 'object' && (err.code || err.name))
                    error.code = err.code || err.name;
                return json_1.encoder.encode([5 /* FsaNodeWorkerMessageCode.ResponseError */, error]);
            }
        };
        this.handlers = {
            stat: async (location) => {
                const handle = await this.getFileOrDir(location[0], location[1], 'statSync');
                return {
                    kind: handle.kind,
                };
            },
            access: async ([filename, mode]) => {
                await this.fs.promises.access(filename, mode);
            },
            readFile: async ([filename, opts]) => {
                const buf = (await this.fs.promises.readFile(filename, { ...opts, encoding: 'buffer' }));
                const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
                return uint8;
            },
            writeFile: async ([filename, data, opts]) => {
                await this.fs.promises.writeFile(filename, data, { ...opts, encoding: 'buffer' });
            },
            appendFile: async ([filename, data, opts]) => {
                await this.fs.promises.appendFile(filename, data, { ...opts, encoding: 'buffer' });
            },
            copy: async ([src, dst, flags]) => {
                await this.fs.promises.copyFile(src, dst, flags);
            },
            move: async ([src, dst]) => {
                await this.fs.promises.rename(src, dst);
            },
            rmdir: async ([filename, options]) => {
                await this.fs.promises.rmdir(filename, options);
            },
            rm: async ([filename, options]) => {
                await this.fs.promises.rm(filename, options);
            },
            mkdir: async ([filename, options]) => {
                return await this.fs.promises.mkdir(filename, options);
            },
            mkdtemp: async ([filename]) => {
                return (await this.fs.promises.mkdtemp(filename, { encoding: 'utf8' }));
            },
            trunc: async ([filename, len]) => {
                await this.fs.promises.truncate(filename, len);
            },
            unlink: async ([filename]) => {
                await this.fs.promises.unlink(filename);
            },
            readdir: async ([filename]) => {
                const list = (await this.fs.promises.readdir(filename, { withFileTypes: true, encoding: 'utf8' }));
                const res = list.map(entry => ({
                    kind: entry.isDirectory() ? 'directory' : 'file',
                    name: entry.name,
                }));
                return res;
            },
            read: async ([filename, position, length]) => {
                let uint8 = new Uint8Array(length);
                const handle = await this.fs.promises.open(filename, 'r');
                const bytesRead = await new Promise((resolve, reject) => {
                    this.fs.read(handle.fd, uint8, 0, length, position, (err, bytesRead) => {
                        if (err)
                            return reject(err);
                        resolve(bytesRead || length);
                    });
                });
                if (bytesRead < length)
                    uint8 = uint8.slice(0, bytesRead);
                return uint8;
            },
            write: async ([filename, data, position]) => {
                const handle = await this.fs.promises.open(filename, 'a');
                const { bytesWritten } = await handle.write(data, 0, data.length, position || undefined);
                return bytesWritten;
            },
            open: async ([filename, flags, mode]) => {
                const handle = await this.fs.promises.open(filename, flags, mode);
                const file = await this.fs.__getFileById(handle.fd);
                await handle.close();
                return file;
            },
        };
    }
    start() {
        onmessage = e => {
            if (!Array.isArray(e.data))
                return;
            this.onPostMessage(e.data);
        };
        const initMsg = [0 /* FsaNodeWorkerMessageCode.Init */, this.sab];
        postMessage(initMsg);
    }
    async getDir(path, create, funcName) {
        let curr = this.root;
        const options = { create };
        try {
            for (const name of path) {
                curr = await curr.getDirectoryHandle(name, options);
            }
        }
        catch (error) {
            // if (error && typeof error === 'object' && error.name === 'TypeMismatchError')
            //   throw createError('ENOTDIR', funcName, path.join(FsaToNodeConstants.Separator));
            throw error;
        }
        return curr;
    }
    async getFile(path, name, funcName, create) {
        const dir = await this.getDir(path, false, funcName);
        const file = await dir.getFileHandle(name, { create });
        return file;
    }
    async getFileOrDir(path, name, funcName, create) {
        const dir = await this.getDir(path, false, funcName);
        if (!name)
            return dir;
        try {
            const file = await dir.getFileHandle(name);
            return file;
        }
        catch (error) {
            if (error && typeof error === 'object') {
                switch (error.name) {
                    case 'TypeMismatchError':
                        return await dir.getDirectoryHandle(name);
                    // case 'NotFoundError':
                    //   throw createError('ENOENT', funcName, path.join(FsaToNodeConstants.Separator));
                }
            }
            throw error;
        }
    }
}
exports.FsaNodeSyncWorker = FsaNodeSyncWorker;
//# sourceMappingURL=FsaNodeSyncWorker.js.map