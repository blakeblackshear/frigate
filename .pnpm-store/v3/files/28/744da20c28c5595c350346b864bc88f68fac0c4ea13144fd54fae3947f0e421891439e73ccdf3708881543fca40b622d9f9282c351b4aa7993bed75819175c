"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsaNodeCore = void 0;
const util_1 = require("../node/util");
const util_2 = require("./util");
const constants_1 = require("../node/constants");
const FsaNodeFsOpenFile_1 = require("./FsaNodeFsOpenFile");
const util = require("../node/util");
const util_3 = require("../core/util");
class FsaNodeCore {
    constructor(root, syncAdapter) {
        this.root = root;
        this.syncAdapter = syncAdapter;
        this.fds = new Map();
        /**
         * A list of reusable (opened and closed) file descriptors, that should be
         * used first before creating a new file descriptor.
         */
        this.releasedFds = [];
        if (root instanceof Promise) {
            root
                .then(root => {
                this.root = root;
            })
                .catch(error => { });
        }
    }
    getSyncAdapter() {
        const adapter = this.syncAdapter;
        if (!adapter)
            throw new Error('No sync adapter');
        return adapter;
    }
    newFdNumber() {
        const releasedFd = this.releasedFds.pop();
        return typeof releasedFd === 'number' ? releasedFd : FsaNodeCore.fd--;
    }
    /**
     * @param path Path from root to the new folder.
     * @param create Whether to create the folders if they don't exist.
     */
    async getDir(path, create, funcName) {
        let curr = await this.root;
        const options = { create };
        try {
            for (const name of path) {
                curr = await curr.getDirectoryHandle(name, options);
            }
        }
        catch (error) {
            if (error && typeof error === 'object') {
                switch (error.name) {
                    case 'TypeMismatchError':
                        throw (0, util_1.createError)('ENOTDIR', funcName, path.join("/" /* FsaToNodeConstants.Separator */));
                    case 'NotFoundError':
                        throw (0, util_1.createError)('ENOENT', funcName, path.join("/" /* FsaToNodeConstants.Separator */));
                }
            }
            throw error;
        }
        return curr;
    }
    async getFile(path, name, funcName, create) {
        const dir = await this.getDir(path, false, funcName);
        const file = await dir.getFileHandle(name, { create });
        return file;
    }
    async getFileOrDir(path, name, funcName) {
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
                        try {
                            return await dir.getDirectoryHandle(name);
                        }
                        catch (error2) {
                            if (error2 && typeof error2 === 'object') {
                                switch (error2.name) {
                                    case 'TypeMismatchError':
                                        throw (0, util_1.createError)('ENOTDIR', funcName, path.join("/" /* FsaToNodeConstants.Separator */));
                                    case 'NotFoundError':
                                        throw (0, util_1.createError)('ENOENT', funcName, path.join("/" /* FsaToNodeConstants.Separator */));
                                }
                            }
                        }
                    case 'NotFoundError':
                        throw (0, util_1.createError)('ENOENT', funcName, path.join("/" /* FsaToNodeConstants.Separator */));
                }
            }
            throw error;
        }
    }
    getFileByFd(fd, funcName) {
        if (!(0, util_3.isFd)(fd))
            throw TypeError(constants_1.ERRSTR.FD);
        const file = this.fds.get(fd);
        if (!file)
            throw (0, util_1.createError)('EBADF', funcName);
        return file;
    }
    async getFileByFdAsync(fd, funcName) {
        return this.getFileByFd(fd, funcName);
    }
    async __getFileById(id, funcName) {
        if (typeof id === 'number')
            return (await this.getFileByFd(id, funcName)).file;
        const filename = (0, util_1.pathToFilename)(id);
        const [folder, name] = (0, util_2.pathToLocation)(filename);
        return await this.getFile(folder, name, funcName);
    }
    async getFileByIdOrCreate(id, funcName) {
        if (typeof id === 'number')
            return (await this.getFileByFd(id, funcName)).file;
        const filename = (0, util_1.pathToFilename)(id);
        const [folder, name] = (0, util_2.pathToLocation)(filename);
        const dir = await this.getDir(folder, false, funcName);
        return await dir.getFileHandle(name, { create: true });
    }
    async __open(filename, flags, mode) {
        const [folder, name] = (0, util_2.pathToLocation)(filename);
        const throwIfExists = !!(flags & 128 /* FLAG_CON.O_EXCL */);
        if (throwIfExists) {
            try {
                await this.getFile(folder, name, 'open', false);
                throw util.createError('EEXIST', 'writeFile');
            }
            catch (error) {
                const file404 = error && typeof error === 'object' && (error.code === 'ENOENT' || error.name === 'NotFoundError');
                if (!file404) {
                    if (error && typeof error === 'object') {
                        switch (error.name) {
                            case 'TypeMismatchError':
                                throw (0, util_1.createError)('ENOTDIR', 'open', filename);
                            case 'NotFoundError':
                                throw (0, util_1.createError)('ENOENT', 'open', filename);
                        }
                    }
                    throw error;
                }
            }
        }
        try {
            const createIfMissing = !!(flags & 64 /* FLAG_CON.O_CREAT */);
            const fsaFile = await this.getFile(folder, name, 'open', createIfMissing);
            return this.__open2(fsaFile, filename, flags, mode);
        }
        catch (error) {
            if (error && typeof error === 'object') {
                switch (error.name) {
                    case 'TypeMismatchError':
                        throw (0, util_1.createError)('ENOTDIR', 'open', filename);
                    case 'NotFoundError':
                        throw (0, util_1.createError)('ENOENT', 'open', filename);
                }
            }
            throw error;
        }
    }
    __open2(fsaFile, filename, flags, mode) {
        const fd = this.newFdNumber();
        const file = new FsaNodeFsOpenFile_1.FsaNodeFsOpenFile(fd, mode, flags, fsaFile, filename);
        this.fds.set(fd, file);
        return file;
    }
    async __close(fd) {
        const openFile = await this.getFileByFdAsync(fd, 'close');
        await openFile.close();
        const deleted = this.fds.delete(fd);
        if (deleted)
            this.releasedFds.push(fd);
    }
    getFileName(id) {
        if (typeof id === 'number') {
            const openFile = this.fds.get(id);
            if (!openFile)
                throw (0, util_1.createError)('EBADF', 'readFile');
            return openFile.filename;
        }
        return (0, util_1.pathToFilename)(id);
    }
}
exports.FsaNodeCore = FsaNodeCore;
FsaNodeCore.fd = 0x7fffffff;
//# sourceMappingURL=FsaNodeCore.js.map