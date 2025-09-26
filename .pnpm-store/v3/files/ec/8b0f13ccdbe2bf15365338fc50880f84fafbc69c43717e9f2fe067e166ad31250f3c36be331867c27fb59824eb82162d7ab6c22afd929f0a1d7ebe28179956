"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeFileSystemDirectoryHandle = void 0;
const NodeFileSystemHandle_1 = require("./NodeFileSystemHandle");
const util_1 = require("./util");
const NodeFileSystemFileHandle_1 = require("./NodeFileSystemFileHandle");
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle
 */
class NodeFileSystemDirectoryHandle extends NodeFileSystemHandle_1.NodeFileSystemHandle {
    constructor(fs, path, ctx = {}) {
        const fullCtx = (0, util_1.ctx)(ctx);
        super('directory', (0, util_1.basename)(path, fullCtx.separator));
        this.fs = fs;
        this.ctx = fullCtx;
        this.__path = path[path.length - 1] === this.ctx.separator ? path : path + this.ctx.separator;
    }
    /**
     * Returns a new array iterator containing the keys for each item in
     * {@link NodeFileSystemDirectoryHandle} object.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/keys
     */
    async *keys() {
        const list = await this.fs.promises.readdir(this.__path);
        for (const name of list)
            yield '' + name;
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/entries
     */
    async *entries() {
        const { __path: path, fs, ctx } = this;
        const list = await fs.promises.readdir(path, { withFileTypes: true });
        for (const d of list) {
            const dirent = d;
            const name = dirent.name + '';
            const newPath = path + name;
            if (dirent.isDirectory())
                yield [name, new NodeFileSystemDirectoryHandle(fs, newPath, ctx)];
            else if (dirent.isFile())
                yield [name, new NodeFileSystemFileHandle_1.NodeFileSystemFileHandle(fs, newPath, ctx)];
        }
    }
    /**
     * Returns a new array iterator containing the values for each index in the
     * {@link FileSystemDirectoryHandle} object.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/values
     */
    async *values() {
        for await (const [, value] of this.entries())
            yield value;
    }
    /**
     * Returns a {@link NodeFileSystemDirectoryHandle} for a subdirectory with the specified
     * name within the directory handle on which the method is called.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getDirectoryHandle
     * @param name A string representing the {@link NodeFileSystemHandle} name of
     *        the subdirectory you wish to retrieve.
     * @param options An optional object containing options for the retrieved
     *        subdirectory.
     */
    async getDirectoryHandle(name, options) {
        (0, util_1.assertName)(name, 'getDirectoryHandle', 'FileSystemDirectoryHandle');
        const filename = this.__path + name;
        try {
            const stats = await this.fs.promises.stat(filename);
            if (!stats.isDirectory())
                throw (0, util_1.newTypeMismatchError)();
            return new NodeFileSystemDirectoryHandle(this.fs, filename, this.ctx);
        }
        catch (error) {
            if (error instanceof DOMException)
                throw error;
            if (error && typeof error === 'object') {
                switch (error.code) {
                    case 'ENOENT': {
                        if (options?.create) {
                            (0, util_1.assertCanWrite)(this.ctx.mode);
                            await this.fs.promises.mkdir(filename);
                            return new NodeFileSystemDirectoryHandle(this.fs, filename, this.ctx);
                        }
                        throw (0, util_1.newNotFoundError)();
                    }
                    case 'EPERM':
                    case 'EACCES':
                        throw (0, util_1.newNotAllowedError)();
                }
            }
            throw error;
        }
    }
    /**
     * Returns a {@link FileSystemFileHandle} for a file with the specified name,
     * within the directory the method is called.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/getFileHandle
     * @param name A string representing the {@link NodeFileSystemHandle} name of
     *        the file you wish to retrieve.
     * @param options An optional object containing options for the retrieved file.
     */
    async getFileHandle(name, options) {
        (0, util_1.assertName)(name, 'getFileHandle', 'FileSystemDirectoryHandle');
        const filename = this.__path + name;
        try {
            const stats = await this.fs.promises.stat(filename);
            if (!stats.isFile())
                throw (0, util_1.newTypeMismatchError)();
            return new NodeFileSystemFileHandle_1.NodeFileSystemFileHandle(this.fs, filename, this.ctx);
        }
        catch (error) {
            if (error instanceof DOMException)
                throw error;
            if (error && typeof error === 'object') {
                switch (error.code) {
                    case 'ENOENT': {
                        if (options?.create) {
                            (0, util_1.assertCanWrite)(this.ctx.mode);
                            await this.fs.promises.writeFile(filename, '');
                            return new NodeFileSystemFileHandle_1.NodeFileSystemFileHandle(this.fs, filename, this.ctx);
                        }
                        throw (0, util_1.newNotFoundError)();
                    }
                    case 'EPERM':
                    case 'EACCES':
                        throw (0, util_1.newNotAllowedError)();
                }
            }
            throw error;
        }
    }
    /**
     * Attempts to remove an entry if the directory handle contains a file or
     * directory called the name specified.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry
     * @param name A string representing the {@link FileSystemHandle} name of the
     *        entry you wish to remove.
     * @param options An optional object containing options.
     */
    async removeEntry(name, { recursive = false } = {}) {
        (0, util_1.assertCanWrite)(this.ctx.mode);
        (0, util_1.assertName)(name, 'removeEntry', 'FileSystemDirectoryHandle');
        const filename = this.__path + name;
        const promises = this.fs.promises;
        try {
            const stats = await promises.stat(filename);
            if (stats.isFile()) {
                await promises.unlink(filename);
            }
            else if (stats.isDirectory()) {
                await promises.rmdir(filename, { recursive });
            }
            else
                throw (0, util_1.newTypeMismatchError)();
        }
        catch (error) {
            if (error instanceof DOMException)
                throw error;
            if (error && typeof error === 'object') {
                switch (error.code) {
                    case 'ENOENT': {
                        throw (0, util_1.newNotFoundError)();
                    }
                    case 'EPERM':
                    case 'EACCES':
                        throw (0, util_1.newNotAllowedError)();
                    case 'ENOTEMPTY':
                        throw new DOMException('The object can not be modified in this way.', 'InvalidModificationError');
                }
            }
            throw error;
        }
    }
    /**
     * The `resolve()` method of the {@link FileSystemDirectoryHandle} interface
     * returns an {@link Array} of directory names from the parent handle to the specified
     * child entry, with the name of the child entry as the last array item.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/resolve
     * @param possibleDescendant The {@link IFileSystemHandle} from which
     *        to return the relative path.
     */
    async resolve(possibleDescendant) {
        if (possibleDescendant instanceof NodeFileSystemDirectoryHandle ||
            possibleDescendant instanceof NodeFileSystemFileHandle_1.NodeFileSystemFileHandle) {
            const path = this.__path;
            const childPath = possibleDescendant.__path;
            if (!childPath.startsWith(path))
                return null;
            let relative = childPath.slice(path.length);
            if (relative === '')
                return [];
            const separator = this.ctx.separator;
            if (relative[0] === separator)
                relative = relative.slice(1);
            return relative.split(separator);
        }
        return null;
    }
}
exports.NodeFileSystemDirectoryHandle = NodeFileSystemDirectoryHandle;
//# sourceMappingURL=NodeFileSystemDirectoryHandle.js.map